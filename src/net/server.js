// @ts-self-types="./server.d.ts"
// Tracks who is connected, keeps a player's identity and data across a dropped
// socket, and fans messages out to named groups.
//
// It opens no ports. Hand it a socket from `ws`, `Deno.serve`, `Bun.serve`, or
// anything else that provides `addEventListener`, `send`, and `close`.

import { EventEmitter } from '../events.js';
import { wrapSocket } from './transport.js';
import { createGroup } from './group.js';
import {
	PROTOCOL_VERSION,
	CHANNEL_PROTOCOL,
	CHANNEL_GAME,
	HELLO,
	WELCOME,
	PING,
	PONG,
	CLOSE_VERSION,
	CLOSE_REPLACED,
	CLOSE_UNGREETED,
	CLOSE_MALFORMED,
	frame,
	readFrame,
} from './protocol.js';

const DEFAULT_SESSION_TTL_MS = 30000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 5000;
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 15000;

export function createServer({
	codec,
	sessionTtl = DEFAULT_SESSION_TTL_MS,
	heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL_MS,
	heartbeatTimeout = DEFAULT_HEARTBEAT_TIMEOUT_MS,
	idFactory = () => crypto.randomUUID(),
} = {}) {
	const server = new EventEmitter();
	const groupsByName = new Map();
	const clientsById = new Map();
	const clientsByToken = new Map();

	// A handler that throws must not take the socket down with it, so every
	// emit goes through here. An `error` handler that throws is dropped rather
	// than looped back.
	function emit(event, ...args) {
		try {
			server.emit(event, ...args);
		} catch (err) {
			if (event === 'error') return;
			try {
				server.emit('error', err, args[0] ?? null);
			} catch {
				// Nothing left to report to.
			}
		}
	}

	function excluded(except) {
		if (except == null) return [];
		return Array.isArray(except) ? except : [except];
	}

	function group(name, { persist = false } = {}) {
		let found = groupsByName.get(name);
		if (!found) {
			found = createGroup(name, {
				persist,
				onEmpty: empty => groupsByName.delete(empty.name),
			});
			groupsByName.set(name, found);
		}
		return found;
	}

	function sendProtocol(client, payload) {
		client._wrapped?.send(frame(CHANNEL_PROTOCOL, payload));
	}

	function startHeartbeat(client) {
		stopHeartbeat(client);
		client._lastPong = Date.now();
		client._pingTimer = setInterval(() => {
			if (Date.now() - client._lastPong >= heartbeatTimeout) {
				// Closing runs the normal disconnect path, so the player still
				// gets the grace window.
				client._raw?.close(1001, 'heartbeat timeout');
				return;
			}
			sendProtocol(client, { type: PING, t: Date.now() });
		}, heartbeatInterval);
	}

	function stopHeartbeat(client) {
		if (client._pingTimer === null) return;
		clearInterval(client._pingTimer);
		client._pingTimer = null;
	}

	function createClient() {
		const id = idFactory();
		const token = idFactory();
		const client = {
			id,
			data: {},
			groups: new Set(),
			connected: false,
			latency: null,
			_token: token,
			_raw: null,
			_wrapped: null,
			_graceTimer: null,
			_pingTimer: null,
			_lastPong: 0,
			_ended: false,

			send(msg) {
				if (!client.connected || !client._wrapped) return false;
				client._wrapped.send(frame(CHANNEL_GAME, msg));
				return true;
			},

			join(name) {
				group(name).add(client);
				return client;
			},

			leave(name) {
				groupsByName.get(name)?.remove(client);
				return client;
			},

			// Ends the session now. Detaching the socket first keeps the close
			// handler from starting a grace period the caller does not want.
			close(code = 1000, reason = '') {
				const socket = client._raw;
				client._raw = null;
				client._wrapped = null;
				socket?.close(code, reason);
				endSession(client);
			},
		};
		clientsById.set(id, client);
		clientsByToken.set(token, client);
		return client;
	}

	function attach(client, socket, wrapped) {
		client._raw = socket;
		client._wrapped = wrapped;
		client.connected = true;
		startHeartbeat(client);
	}

	function detach(client) {
		client._raw = null;
		client._wrapped = null;
		client.connected = false;
		stopHeartbeat(client);
	}

	function endSession(client) {
		if (client._ended) return;
		client._ended = true;
		if (client._graceTimer !== null) {
			clearTimeout(client._graceTimer);
			client._graceTimer = null;
		}
		detach(client);
		for (const member of [...client.groups]) member.remove(client);
		clientsById.delete(client.id);
		clientsByToken.delete(client._token);
		emit('end', client);
	}

	// Ignores a close for a socket the client has already moved off, which
	// happens when a newer connection takes the session over.
	function handleClose(client, socket) {
		if (client._raw !== socket) return;
		detach(client);
		emit('disconnect', client);
		client._graceTimer = setTimeout(() => {
			client._graceTimer = null;
			endSession(client);
		}, sessionTtl);
	}

	function handleHello(socket, wrapped, payload) {
		if (payload?.version !== PROTOCOL_VERSION) {
			socket.close(CLOSE_VERSION, 'protocol version mismatch');
			return null;
		}

		const prior = payload.sessionToken ? clientsByToken.get(payload.sessionToken) : null;
		if (prior) {
			const resuming = prior._graceTimer !== null;
			if (prior.connected) {
				// The same player opened a second connection. Drop the old
				// socket without ending the session.
				const stale = prior._raw;
				prior._raw = null;
				prior._wrapped = null;
				stale?.close(CLOSE_REPLACED, 'replaced by a newer connection');
			}
			if (prior._graceTimer !== null) {
				clearTimeout(prior._graceTimer);
				prior._graceTimer = null;
			}
			attach(prior, socket, wrapped);
			sendProtocol(prior, { type: WELCOME, clientId: prior.id, sessionToken: prior._token });
			if (resuming) emit('resume', prior);
			return prior;
		}

		const client = createClient();
		attach(client, socket, wrapped);
		sendProtocol(client, { type: WELCOME, clientId: client.id, sessionToken: client._token });
		emit('connection', client);
		return client;
	}

	function accept(socket) {
		let client = null;
		let wrapped = null;

		wrapped = wrapSocket(socket, {
			codec,
			onMessage: value => {
				const parsed = readFrame(value);
				if (!parsed) {
					emit('error', new Error('malformed frame'), client);
					socket.close(CLOSE_MALFORMED, 'malformed frame');
					return;
				}

				if (parsed.channel === CHANNEL_PROTOCOL) {
					const payload = parsed.payload;
					if (payload?.type === HELLO) {
						// A second hello on a socket that already has a session
						// is ignored, so a replay cannot re-greet.
						if (client) return;
						client = handleHello(socket, wrapped, payload);
						return;
					}
					if (payload?.type === PONG && client) {
						client._lastPong = Date.now();
						client.latency = Date.now() - payload.t;
					}
					return;
				}

				if (parsed.channel !== CHANNEL_GAME) return;

				if (!client) {
					socket.close(CLOSE_UNGREETED, 'handshake required');
					return;
				}
				emit('message', client, parsed.payload);
			},
			onClose: () => {
				if (client) handleClose(client, socket);
			},
			onError: err => emit('error', err, client),
		});

		return wrapped;
	}

	function send(msg, clients) {
		for (const client of clients) client.send(msg);
	}

	function broadcast(msg, { except = null } = {}) {
		const skip = excluded(except);
		for (const client of [...clientsById.values()]) {
			if (skip.includes(client)) continue;
			client.send(msg);
		}
	}

	function close() {
		for (const client of [...clientsById.values()]) client.close(1001, 'server closing');
		for (const found of [...groupsByName.values()]) found.close();
		groupsByName.clear();
	}

	server.accept = accept;
	server.group = group;
	server.send = send;
	server.broadcast = broadcast;
	server.close = close;
	Object.defineProperties(server, {
		groups: { get: () => [...groupsByName.values()] },
		clients: { get: () => [...clientsById.values()] },
	});

	return server;
}
