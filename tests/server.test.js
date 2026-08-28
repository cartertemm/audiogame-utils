import { describe, test, expect, vi, afterEach } from 'vitest';
import { createServer } from '../src/net/server.js';
import { createSocketPair } from '../src/net/testing.js';
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
} from '../src/net/protocol.js';

// Counted ids keep every assertion readable and every run identical.
function counter(prefix) {
	let n = 0;
	return () => `${prefix}${++n}`;
}

function newServer(options = {}) {
	return createServer({ idFactory: counter('id-'), ...options });
}

// Returns the peer end of a socket the server has accepted, plus helpers for
// speaking the protocol from the client side.
function connect(server, { clientId = null, sessionToken = null, version = PROTOCOL_VERSION } = {}) {
	const [serverSocket, clientSocket] = createSocketPair();
	const inbox = [];
	clientSocket.addEventListener('message', event => inbox.push(JSON.parse(event.data)));
	server.accept(serverSocket);
	const peer = {
		socket: clientSocket,
		inbox,
		closes: [],
		sendRaw(value) { clientSocket.send(JSON.stringify(value)); },
		sendGame(payload) { peer.sendRaw([CHANNEL_GAME, payload]); },
		sendProtocol(payload) { peer.sendRaw([CHANNEL_PROTOCOL, payload]); },
		hello() { peer.sendProtocol({ type: HELLO, version, clientId, sessionToken }); return peer; },
		// Protocol payloads the client received, in order.
		protocol() { return inbox.filter(f => f[0] === CHANNEL_PROTOCOL).map(f => f[1]); },
		// Game payloads the client received, in order.
		game() { return inbox.filter(f => f[0] === CHANNEL_GAME).map(f => f[1]); },
		welcome() { return peer.protocol().find(p => p.type === WELCOME) ?? null; },
	};
	clientSocket.addEventListener('close', event => peer.closes.push(event));
	return peer;
}

afterEach(() => {
	vi.useRealTimers();
});

describe('createServer handshake', () => {
	test('a hello is answered with a welcome carrying an id and a token', () => {
		const server = newServer();
		const peer = connect(server).hello();
		const welcome = peer.welcome();
		expect(welcome).toEqual({
			type: WELCOME,
			clientId: 'id-1',
			sessionToken: expect.any(String),
		});
		// The token is a secret, so it never comes from the caller's idFactory.
		expect(welcome.sessionToken).not.toMatch(/^id-/);
		expect(welcome.sessionToken.length).toBeGreaterThan(20);
	});

	test('the session token is unguessable even with a readable idFactory', () => {
		const server = newServer();
		const first = connect(server).hello().welcome();
		const second = connect(server).hello().welcome();
		// Counted ids advance one per client, so nothing about the id leaks the
		// token of this client or the next one.
		expect(first.clientId).toBe('id-1');
		expect(second.clientId).toBe('id-2');
		expect(first.sessionToken).not.toBe(second.sessionToken);
		expect([first.clientId, second.clientId, 'id-3']).not.toContain(first.sessionToken);
	});

	test('a hello emits connection with a client', () => {
		const server = newServer();
		const seen = [];
		server.on('connection', client => seen.push(client));
		connect(server).hello();
		expect(seen).toHaveLength(1);
		expect(seen[0].id).toBe('id-1');
		expect(seen[0].connected).toBe(true);
		expect(seen[0].data).toEqual({});
		expect(seen[0].latency).toBeNull();
	});

	test('an unknown session token is treated as a first connection', () => {
		const server = newServer();
		const seen = [];
		server.on('connection', client => seen.push(client.id));
		connect(server, { clientId: 'ghost', sessionToken: 'not-a-real-token' }).hello();
		expect(seen).toEqual(['id-1']);
	});

	test('a version mismatch closes with 4001 and emits nothing', () => {
		const server = newServer();
		const seen = [];
		server.on('connection', client => seen.push(client));
		const peer = connect(server, { version: 99 }).hello();
		expect(seen).toEqual([]);
		expect(peer.closes[0].code).toBe(CLOSE_VERSION);
		expect(server.clients).toEqual([]);
	});

	test('a game frame before the hello closes with 4003', () => {
		const server = newServer();
		const seen = [];
		server.on('message', (client, msg) => seen.push(msg));
		const peer = connect(server);
		peer.sendGame({ type: 'shot' });
		expect(seen).toEqual([]);
		expect(peer.closes[0].code).toBe(CLOSE_UNGREETED);
	});

	test('a malformed frame closes with 4004 and emits error', () => {
		const server = newServer();
		const errors = [];
		server.on('error', (err, client) => errors.push([err, client]));
		const peer = connect(server).hello();
		peer.sendRaw({ not: 'a frame' });
		expect(errors).toHaveLength(1);
		expect(errors[0][0]).toBeInstanceOf(Error);
		expect(peer.closes[0].code).toBe(CLOSE_MALFORMED);
	});

	test('a codec that fails to decode reaches the error event', () => {
		const codec = {
			encode: JSON.stringify,
			decode: () => { throw new RangeError('unsupported version'); },
		};
		const server = createServer({ idFactory: counter('id-'), codec });
		const errors = [];
		server.on('error', (err, client) => errors.push([err, client]));
		const [serverSocket, clientSocket] = createSocketPair();
		server.accept(serverSocket);
		clientSocket.send('anything');
		expect(errors).toHaveLength(1);
		expect(errors[0][0]).toBeInstanceOf(RangeError);
		expect(errors[0][1]).toBeNull();
		// A decoding failure leaves the socket open, as the transport promises.
		expect(clientSocket.readyState).toBe(1);
	});

	test('an unknown channel is ignored and the socket stays open', () => {
		const server = newServer();
		const peer = connect(server).hello();
		peer.sendRaw([7, { type: 'from-the-future' }]);
		expect(peer.closes).toEqual([]);
		expect(peer.socket.readyState).toBe(1);
	});

	test('a second hello on the same socket is ignored', () => {
		const server = newServer();
		const seen = [];
		server.on('connection', client => seen.push(client.id));
		const peer = connect(server).hello();
		peer.hello();
		expect(seen).toEqual(['id-1']);
	});
});

describe('createServer messages', () => {
	test('a game frame reaches the message event with its client', () => {
		const server = newServer();
		const seen = [];
		server.on('message', (client, msg) => seen.push([client.id, msg]));
		const peer = connect(server).hello();
		peer.sendGame({ type: 'shot', at: 3 });
		expect(seen).toEqual([['id-1', { type: 'shot', at: 3 }]]);
	});

	test('a game payload that is not an object round trips', () => {
		const server = newServer();
		const seen = [];
		server.on('message', (client, msg) => seen.push(msg));
		const peer = connect(server).hello();
		peer.sendGame(42);
		peer.sendGame('hi');
		peer.sendGame([1, 2, 3]);
		expect(seen).toEqual([42, 'hi', [1, 2, 3]]);
	});

	test('client.send frames on the game channel and returns true', () => {
		const server = newServer();
		let client = null;
		server.on('connection', c => { client = c; });
		const peer = connect(server).hello();
		expect(client.send({ type: 'welcome-aboard' })).toBe(true);
		expect(peer.game()).toEqual([{ type: 'welcome-aboard' }]);
	});

	test('a throwing handler emits error and does not kill the server', () => {
		const server = newServer();
		const errors = [];
		server.on('message', () => { throw new Error('handler blew up'); });
		server.on('error', (err, client) => errors.push([err.message, client?.id]));
		const peer = connect(server).hello();
		peer.sendGame({ type: 'shot' });
		expect(errors).toEqual([['handler blew up', 'id-1']]);
		expect(peer.socket.readyState).toBe(1);
		// The server still works afterwards.
		expect(server.clients).toHaveLength(1);
	});
});

describe('createServer fan out', () => {
	test('broadcast reaches every connected client', () => {
		const server = newServer();
		const a = connect(server).hello();
		const b = connect(server).hello();
		server.broadcast({ type: 'bell' });
		expect(a.game()).toEqual([{ type: 'bell' }]);
		expect(b.game()).toEqual([{ type: 'bell' }]);
	});

	test('broadcast skips excluded clients', () => {
		const server = newServer();
		const clients = [];
		server.on('connection', c => clients.push(c));
		const a = connect(server).hello();
		const b = connect(server).hello();
		server.broadcast({ type: 'bell' }, { except: clients[0] });
		expect(a.game()).toEqual([]);
		expect(b.game()).toEqual([{ type: 'bell' }]);
	});

	test('broadcast skips an array of excluded clients', () => {
		const server = newServer();
		const clients = [];
		server.on('connection', c => clients.push(c));
		const a = connect(server).hello();
		const b = connect(server).hello();
		const c = connect(server).hello();
		server.broadcast({ type: 'bell' }, { except: [clients[0], clients[2]] });
		expect(a.game()).toEqual([]);
		expect(b.game()).toEqual([{ type: 'bell' }]);
		expect(c.game()).toEqual([]);
	});

	test('send reaches an ad hoc list', () => {
		const server = newServer();
		const clients = [];
		server.on('connection', c => clients.push(c));
		const a = connect(server).hello();
		const b = connect(server).hello();
		server.send({ type: 'team' }, [clients[1]]);
		expect(a.game()).toEqual([]);
		expect(b.game()).toEqual([{ type: 'team' }]);
	});

	test('group creates on first use and is returned again by name', () => {
		const server = newServer();
		const lobby = server.group('lobby');
		expect(server.group('lobby')).toBe(lobby);
		expect(server.groups).toEqual([lobby]);
	});

	test('join and leave move a client through a group', () => {
		const server = newServer();
		let client = null;
		server.on('connection', c => { client = c; });
		connect(server).hello();
		client.join('lobby');
		expect(server.group('lobby').clients).toEqual([client]);
		expect(client.groups.has(server.group('lobby'))).toBe(true);
		client.leave('lobby');
		expect(server.groups).toEqual([]);
	});

	test('leaving a group that does not exist does nothing', () => {
		const server = newServer();
		let client = null;
		server.on('connection', c => { client = c; });
		connect(server).hello();
		expect(() => client.leave('nowhere')).not.toThrow();
	});

	test('an empty group deletes itself unless it is persistent', () => {
		const server = newServer();
		let client = null;
		server.on('connection', c => { client = c; });
		connect(server).hello();
		server.group('kept', { persist: true }).add(client);
		client.join('temporary');
		client.leave('temporary');
		client.leave('kept');
		expect(server.groups.map(g => g.name)).toEqual(['kept']);
	});

	test('a group send reaches its members only', () => {
		const server = newServer();
		const clients = [];
		server.on('connection', c => clients.push(c));
		const a = connect(server).hello();
		const b = connect(server).hello();
		clients[0].join('red');
		server.group('red').send({ type: 'go' });
		expect(a.game()).toEqual([{ type: 'go' }]);
		expect(b.game()).toEqual([]);
	});
});

describe('createServer sessions', () => {
	test('a socket close emits disconnect and keeps the client', () => {
		vi.useFakeTimers();
		const server = newServer({ sessionTtl: 30000 });
		const events = [];
		server.on('disconnect', client => events.push(['disconnect', client.id]));
		server.on('end', client => events.push(['end', client.id]));
		const peer = connect(server).hello();
		peer.socket.close();
		expect(events).toEqual([['disconnect', 'id-1']]);
		expect(server.clients).toHaveLength(1);
		expect(server.clients[0].connected).toBe(false);
	});

	test('the grace period expiring emits end and drops the client', () => {
		vi.useFakeTimers();
		const server = newServer({ sessionTtl: 30000 });
		const events = [];
		server.on('end', client => events.push(client.id));
		const peer = connect(server).hello();
		peer.socket.close();
		vi.advanceTimersByTime(29999);
		expect(events).toEqual([]);
		vi.advanceTimersByTime(1);
		expect(events).toEqual(['id-1']);
		expect(server.clients).toEqual([]);
	});

	test('a resume inside the window keeps data and group membership', () => {
		vi.useFakeTimers();
		const server = newServer({ sessionTtl: 30000 });
		let client = null;
		const events = [];
		server.on('connection', c => { client = c; c.data.score = 7; c.join('lobby'); });
		server.on('resume', c => events.push(['resume', c.id]));
		server.on('connection', c => events.push(['connection', c.id]));

		const first = connect(server).hello();
		const welcome = first.welcome();
		first.socket.close();
		vi.advanceTimersByTime(10000);

		const second = connect(server, {
			clientId: welcome.clientId,
			sessionToken: welcome.sessionToken,
		}).hello();

		expect(events).toEqual([['connection', 'id-1'], ['resume', 'id-1']]);
		expect(second.welcome()).toEqual(welcome);
		expect(client.data.score).toBe(7);
		expect(client.connected).toBe(true);
		expect(server.group('lobby').clients).toEqual([client]);
		expect(server.clients).toHaveLength(1);
	});

	test('a resume after the window is a new session with a new id', () => {
		vi.useFakeTimers();
		const server = newServer({ sessionTtl: 30000 });
		const events = [];
		server.on('connection', c => events.push(['connection', c.id]));
		server.on('resume', c => events.push(['resume', c.id]));
		server.on('end', c => events.push(['end', c.id]));

		const first = connect(server).hello();
		const welcome = first.welcome();
		first.socket.close();
		vi.advanceTimersByTime(30000);

		connect(server, {
			clientId: welcome.clientId,
			sessionToken: welcome.sessionToken,
		}).hello();

		expect(events).toEqual([
			['connection', 'id-1'],
			['end', 'id-1'],
			['connection', 'id-2'],
		]);
	});

	test('the client is out of every group before end fires', () => {
		vi.useFakeTimers();
		const server = newServer({ sessionTtl: 1000 });
		let membersAtEnd = null;
		server.on('connection', c => c.join('lobby'));
		server.on('end', client => {
			membersAtEnd = {
				group: server.group('lobby').clients.length,
				client: client.groups.size,
			};
		});
		const peer = connect(server).hello();
		peer.socket.close();
		vi.advanceTimersByTime(1000);
		expect(membersAtEnd).toEqual({ group: 0, client: 0 });
	});

	test('a second connection with a live token takes over and closes the old socket', () => {
		const server = newServer();
		const events = [];
		server.on('connection', c => events.push(['connection', c.id]));
		server.on('resume', c => events.push(['resume', c.id]));
		server.on('disconnect', c => events.push(['disconnect', c.id]));
		server.on('end', c => events.push(['end', c.id]));

		const first = connect(server).hello();
		const welcome = first.welcome();
		const second = connect(server, {
			clientId: welcome.clientId,
			sessionToken: welcome.sessionToken,
		}).hello();

		expect(first.closes[0].code).toBe(CLOSE_REPLACED);
		expect(second.welcome()).toEqual(welcome);
		// The session never ended, so only the original connection is reported.
		expect(events).toEqual([['connection', 'id-1']]);
		expect(server.clients).toHaveLength(1);
		expect(server.clients[0].connected).toBe(true);
	});

	test('a send to a dropped client returns false and is discarded', () => {
		vi.useFakeTimers();
		const server = newServer({ sessionTtl: 30000 });
		let client = null;
		server.on('connection', c => { client = c; });
		const peer = connect(server).hello();
		peer.socket.close();
		expect(client.send({ type: 'late' })).toBe(false);
		expect(peer.game()).toEqual([]);
	});

	test('client.close ends the session immediately, with no grace period', () => {
		vi.useFakeTimers();
		const server = newServer({ sessionTtl: 30000 });
		let client = null;
		const events = [];
		server.on('connection', c => { client = c; });
		server.on('disconnect', c => events.push(['disconnect', c.id]));
		server.on('end', c => events.push(['end', c.id]));
		const peer = connect(server).hello();
		client.close(4000, 'kicked');
		expect(events).toEqual([['end', 'id-1']]);
		expect(peer.closes[0].code).toBe(4000);
		expect(server.clients).toEqual([]);
	});

	test('server.close ends every session and clears every timer', () => {
		vi.useFakeTimers();
		const server = newServer({ sessionTtl: 30000 });
		const ends = [];
		server.on('end', c => ends.push(c.id));
		server.on('connection', c => c.join('lobby'));
		connect(server).hello();
		connect(server).hello();
		server.close();
		expect(ends).toEqual(['id-1', 'id-2']);
		expect(server.clients).toEqual([]);
		expect(server.groups).toEqual([]);
		expect(vi.getTimerCount()).toBe(0);
	});

	test('server.close clears the grace timer of a client mid grace period', () => {
		vi.useFakeTimers();
		const server = newServer({ sessionTtl: 30000 });
		const ends = [];
		server.on('end', c => ends.push(c.id));
		const peer = connect(server).hello();
		peer.socket.close();
		// One grace timer, no ping timer.
		expect(vi.getTimerCount()).toBe(1);

		server.close();
		expect(ends).toEqual(['id-1']);
		expect(server.clients).toEqual([]);
		expect(vi.getTimerCount()).toBe(0);
	});

	test('client.close inside a disconnect handler leaves no grace timer', () => {
		vi.useFakeTimers();
		const server = newServer({ sessionTtl: 30000 });
		const events = [];
		server.on('disconnect', c => { events.push(['disconnect', c.id]); c.close(); });
		server.on('end', c => events.push(['end', c.id]));
		const peer = connect(server).hello();
		peer.socket.close();
		expect(events).toEqual([['disconnect', 'id-1'], ['end', 'id-1']]);
		expect(server.clients).toEqual([]);
		expect(vi.getTimerCount()).toBe(0);
	});

	test('a hello after server.close starts no session and no heartbeat', () => {
		vi.useFakeTimers();
		const server = newServer();
		const seen = [];
		server.on('connection', c => seen.push(c.id));
		const peer = connect(server);
		server.close();
		expect(() => peer.hello()).not.toThrow();
		expect(seen).toEqual([]);
		expect(server.clients).toEqual([]);
		expect(vi.getTimerCount()).toBe(0);
	});

	test('accept after server.close closes the socket', () => {
		const server = newServer();
		server.close();
		const peer = connect(server);
		expect(peer.socket.readyState).toBe(3);
		expect(server.clients).toEqual([]);
	});

	test('the default idFactory gives every client a distinct id', () => {
		const server = createServer();
		const ids = [];
		server.on('connection', c => ids.push(c.id));
		connect(server).hello();
		connect(server).hello();
		expect(ids).toHaveLength(2);
		expect(typeof ids[0]).toBe('string');
		expect(ids[0]).not.toBe(ids[1]);
		server.close();
	});
});

describe('createServer heartbeat', () => {
	test('a ping goes out on every interval', () => {
		vi.useFakeTimers();
		const server = newServer({ heartbeatInterval: 5000 });
		const peer = connect(server).hello();
		vi.advanceTimersByTime(5000);
		vi.advanceTimersByTime(5000);
		const pings = peer.protocol().filter(p => p.type === PING);
		expect(pings).toHaveLength(2);
		expect(typeof pings[0].t).toBe('number');
	});

	test('a pong sets latency', () => {
		vi.useFakeTimers();
		vi.setSystemTime(1000);
		const server = newServer({ heartbeatInterval: 5000 });
		let client = null;
		server.on('connection', c => { client = c; });
		const peer = connect(server).hello();
		expect(client.latency).toBeNull();

		vi.advanceTimersByTime(5000);
		const ping = peer.protocol().find(p => p.type === PING);
		vi.setSystemTime(6120);
		peer.sendProtocol({ type: PONG, t: ping.t });
		expect(client.latency).toBe(120);
	});

	test('a malformed pong leaves latency alone and never makes it NaN', () => {
		vi.useFakeTimers();
		vi.setSystemTime(1000);
		const server = newServer({ heartbeatInterval: 5000 });
		let client = null;
		server.on('connection', c => { client = c; });
		const peer = connect(server).hello();

		vi.advanceTimersByTime(5000);
		const ping = peer.protocol().find(p => p.type === PING);
		vi.setSystemTime(6120);
		peer.sendProtocol({ type: PONG, t: ping.t });
		expect(client.latency).toBe(120);

		peer.sendProtocol({ type: PONG });
		expect(client.latency).toBe(120);
		peer.sendProtocol({ type: PONG, t: 'soon' });
		expect(client.latency).toBe(120);
		peer.sendProtocol({ type: PONG, t: null });
		expect(client.latency).toBe(120);
	});

	test('a malformed pong still counts as a heartbeat reply', () => {
		vi.useFakeTimers();
		const server = newServer({ heartbeatInterval: 5000, heartbeatTimeout: 15000 });
		const events = [];
		server.on('disconnect', c => events.push(c.id));
		const peer = connect(server).hello();

		for (let i = 0; i < 5; i += 1) {
			vi.advanceTimersByTime(5000);
			peer.sendProtocol({ type: PONG });
		}

		expect(events).toEqual([]);
		expect(peer.socket.readyState).toBe(1);
	});

	test('a dropped socket clears the last measured latency', () => {
		vi.useFakeTimers();
		vi.setSystemTime(1000);
		const server = newServer({ heartbeatInterval: 5000, sessionTtl: 30000 });
		let client = null;
		server.on('connection', c => { client = c; });
		const peer = connect(server).hello();

		vi.advanceTimersByTime(5000);
		const ping = peer.protocol().find(p => p.type === PING);
		vi.setSystemTime(6120);
		peer.sendProtocol({ type: PONG, t: ping.t });
		expect(client.latency).toBe(120);

		peer.socket.close();
		// A reconnected client must not report the round trip of its old socket.
		expect(client.latency).toBeNull();
	});

	test('no pong within the timeout closes the socket and starts the grace period', () => {
		vi.useFakeTimers();
		const server = newServer({
			heartbeatInterval: 5000,
			heartbeatTimeout: 15000,
			sessionTtl: 30000,
		});
		const events = [];
		server.on('disconnect', c => events.push(['disconnect', c.id]));
		server.on('end', c => events.push(['end', c.id]));
		const peer = connect(server).hello();

		vi.advanceTimersByTime(15000);
		expect(peer.socket.readyState).toBe(3);
		expect(events).toEqual([['disconnect', 'id-1']]);

		vi.advanceTimersByTime(30000);
		expect(events).toEqual([['disconnect', 'id-1'], ['end', 'id-1']]);
	});

	test('answering the pings keeps the connection alive', () => {
		vi.useFakeTimers();
		const server = newServer({ heartbeatInterval: 5000, heartbeatTimeout: 15000 });
		const events = [];
		server.on('disconnect', c => events.push(c.id));
		const peer = connect(server).hello();

		for (let i = 0; i < 10; i += 1) {
			vi.advanceTimersByTime(5000);
			const pings = peer.protocol().filter(p => p.type === PING);
			peer.sendProtocol({ type: PONG, t: pings[pings.length - 1].t });
		}

		expect(events).toEqual([]);
		expect(peer.socket.readyState).toBe(1);
	});

	test('the heartbeat stops while a client is dropped and restarts on resume', () => {
		vi.useFakeTimers();
		const server = newServer({ heartbeatInterval: 5000, sessionTtl: 60000 });
		const first = connect(server).hello();
		const welcome = first.welcome();
		first.socket.close();

		// One grace timer, no ping timer.
		expect(vi.getTimerCount()).toBe(1);

		const second = connect(server, {
			clientId: welcome.clientId,
			sessionToken: welcome.sessionToken,
		}).hello();
		vi.advanceTimersByTime(5000);
		expect(second.protocol().filter(p => p.type === PING)).toHaveLength(1);
	});
});
