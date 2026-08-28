// Encodes WebSocket messages and reconnects the client after a disconnection.

import {
	PROTOCOL_VERSION,
	CHANNEL_PROTOCOL,
	CHANNEL_GAME,
	HELLO,
	WELCOME,
	PING,
	PONG,
	frame,
	readFrame,
	isPermanentClose,
} from './protocol.js';

const JSON_CODEC = {
	encode: msg => JSON.stringify(msg),
	decode: raw => JSON.parse(raw),
};

const DEFAULT_BACKOFFS_MS = [500, 1000, 2000, 4000, 8000, 15000];

// Supports browser WebSockets and `ws` sockets on a server. Both implementations
// provide `addEventListener`.
//
// A decoding error calls `onError` and leaves the socket open.
export function wrapSocket(socket, { codec = JSON_CODEC, onMessage, onClose, onError } = {}) {
	socket.addEventListener('message', event => {
		const data = typeof event.data === 'string' ? event.data : event.data.toString();
		let msg;
		try {
			// Always decode the frame so malformed data reaches `onError`, even
			// when no `onMessage` callback is registered.
			msg = codec.decode(data);
		} catch (err) {
			onError?.(err);
			return;
		}
		onMessage?.(msg);
	});
	socket.addEventListener('close', event => onClose?.(event));
	socket.addEventListener('error', event => onError?.(event));
	return {
		send(msg) { socket.send(codec.encode(msg)); },
		close(code, reason) { socket.close(code, reason); },
		get readyState() { return socket.readyState; },
	};
}

// Increase the reconnect delay after each failure and reset it after a
// successful connection.
//
// `onOpen` receives the wrapped socket for the initial connection and every
// reconnection.
//
// With `protocol: true` the client speaks the framing and the handshake that
// `createServer` expects: it sends `hello` on every connection, answers the
// heartbeat, and keeps protocol traffic out of `onMessage`. Passing an
// `identity` persists the session across a page reload. Without one the
// session still resumes within the page. A close code the protocol treats as
// permanent stops the reconnection, after `onClose` has run.
export function createReconnectingClient({
	url,
	codec = JSON_CODEC,
	backoffs = DEFAULT_BACKOFFS_MS,
	protocol = false,
	identity = null,
	onOpen,
	onMessage,
	onClose,
	onError,
} = {}) {
	let socket = null;
	let wrapped = null;
	let attempt = 0;
	let closedByUser = false;
	let reconnectTimer = null;
	let session = { clientId: null, sessionToken: null };

	function sendGame(msg) {
		wrapped?.send(protocol ? frame(CHANNEL_GAME, msg) : msg);
	}

	// Handed to `onOpen` so a handler cannot send an unframed message by
	// reaching past the client.
	function facade() {
		return {
			send: sendGame,
			close(code, reason) { wrapped?.close(code, reason); },
			get readyState() { return wrapped?.readyState ?? WebSocket.CLOSED; },
		};
	}

	function handleProtocol(payload) {
		if (payload?.type === PING) {
			wrapped?.send(frame(CHANNEL_PROTOCOL, { type: PONG, t: payload.t }));
			return;
		}
		if (payload?.type === WELCOME) {
			session = { clientId: payload.clientId, sessionToken: payload.sessionToken };
			identity?.set(session);
		}
	}

	function handleFrame(value) {
		const parsed = readFrame(value);
		if (!parsed) {
			onError?.(new Error('malformed frame'));
			return;
		}
		if (parsed.channel === CHANNEL_PROTOCOL) {
			handleProtocol(parsed.payload);
			return;
		}
		if (parsed.channel !== CHANNEL_GAME) return;
		onMessage?.(parsed.payload);
	}

	function sendHello() {
		const stored = identity ? identity.get() : session;
		wrapped.send(frame(CHANNEL_PROTOCOL, {
			type: HELLO,
			version: PROTOCOL_VERSION,
			clientId: stored?.clientId ?? null,
			sessionToken: stored?.sessionToken ?? null,
		}));
	}

	function connect() {
		reconnectTimer = null;
		socket = new WebSocket(url);
		wrapped = wrapSocket(socket, {
			codec,
			onMessage: protocol ? handleFrame : onMessage,
			// `onClose` runs first either way, so the game can tell the player
			// why the connection went away before the client gives up.
			onClose: event => {
				onClose?.(event);
				if (closedByUser) return;
				if (protocol && isPermanentClose(event?.code)) return;
				scheduleReconnect();
			},
			onError,
		});
		socket.addEventListener('open', () => {
			attempt = 0;
			if (protocol) sendHello();
			onOpen?.(protocol ? facade() : wrapped);
		});
	}

	function scheduleReconnect() {
		const delay = backoffs[Math.min(attempt, backoffs.length - 1)];
		attempt += 1;
		reconnectTimer = setTimeout(connect, delay);
	}

	connect();

	return {
		send: sendGame,

		// Cancel the pending reconnection before closing the active socket so
		// `close()` keeps the client closed during a reconnect delay.
		close() {
			closedByUser = true;
			if (reconnectTimer) {
				clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			socket?.close();
		},

		get readyState() {
			return socket?.readyState ?? WebSocket.CLOSED;
		},
	};
}
