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
		expect(welcome).toEqual({ type: WELCOME, clientId: 'id-1', sessionToken: 'id-2' });
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
