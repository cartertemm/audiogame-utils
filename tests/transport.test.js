import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { wrapSocket, createReconnectingClient } from '../src/net/transport.js';
import { PERMANENT_CLOSE_CODES, CLOSE_VERSION } from '../src/net/protocol.js';

// Provide the EventTarget methods used by browser WebSockets and the `ws`
// library.
function makeFakeSocket() {
	const listeners = { message: [], close: [], error: [], open: [] };
	return {
		sent: [],
		readyState: 1,
		addEventListener(type, fn) { listeners[type].push(fn); },
		removeEventListener(type, fn) {
			listeners[type] = listeners[type].filter(f => f !== fn);
		},
		send(data) { this.sent.push(data); },
		close(code, reason) {
			this.readyState = 3;
			for (const fn of listeners.close) fn({ code, reason });
		},
		emit(type, event) { for (const fn of listeners[type]) fn(event); },
	};
}

describe('wrapSocket', () => {
	test('encodes outgoing messages as JSON by default', () => {
		const sock = makeFakeSocket();
		wrapSocket(sock, {}).send({ type: 'hello', name: 'Swift Otter' });
		expect(sock.sent).toHaveLength(1);
		expect(JSON.parse(sock.sent[0])).toEqual({ type: 'hello', name: 'Swift Otter' });
	});

	test('dispatches decoded messages to onMessage', () => {
		const sock = makeFakeSocket();
		const seen = [];
		wrapSocket(sock, { onMessage: msg => seen.push(msg) });
		sock.emit('message', { data: JSON.stringify({ type: 'welcome', name: 'x' }) });
		expect(seen).toEqual([{ type: 'welcome', name: 'x' }]);
	});

	test('decodes non-string frame data via toString', () => {
		const sock = makeFakeSocket();
		const seen = [];
		wrapSocket(sock, { onMessage: msg => seen.push(msg) });
		sock.emit('message', { data: Buffer.from(JSON.stringify({ type: 'ping' })) });
		expect(seen).toEqual([{ type: 'ping' }]);
	});

	test('a custom codec replaces JSON in both directions', () => {
		const sock = makeFakeSocket();
		const codec = {
			encode: msg => `MSG:${msg.type}`,
			decode: raw => ({ type: raw.replace('MSG:', '') }),
		};
		const seen = [];
		const wrapped = wrapSocket(sock, { codec, onMessage: msg => seen.push(msg) });
		wrapped.send({ type: 'hello' });
		expect(sock.sent).toEqual(['MSG:hello']);
		sock.emit('message', { data: 'MSG:welcome' });
		expect(seen).toEqual([{ type: 'welcome' }]);
	});

	test('surfaces a decode failure via onError and does not close', () => {
		const sock = makeFakeSocket();
		let err = null;
		let closed = false;
		wrapSocket(sock, {
			onMessage: () => {},
			onError: e => { err = e; },
			onClose: () => { closed = true; },
		});
		sock.emit('message', { data: 'not json' });
		expect(err).toBeInstanceOf(Error);
		expect(closed).toBe(false);
	});

	test('a codec error thrown for any reason reaches onError', () => {
		const sock = makeFakeSocket();
		const codec = {
			encode: JSON.stringify,
			decode: () => { throw new RangeError('unsupported version'); },
		};
		let err = null;
		wrapSocket(sock, { codec, onError: e => { err = e; } });
		sock.emit('message', { data: 'anything' });
		expect(err).toBeInstanceOf(RangeError);
	});

	test('forwards close events to onClose', () => {
		const sock = makeFakeSocket();
		let got = null;
		wrapSocket(sock, { onClose: e => { got = e; } });
		sock.emit('close', { code: 1006 });
		expect(got).toEqual({ code: 1006 });
	});
});

describe('createReconnectingClient', () => {
	let instances;
	let createdUrls;
	let OriginalWebSocket;

	beforeEach(() => {
		instances = [];
		createdUrls = [];
		OriginalWebSocket = globalThis.WebSocket;
		globalThis.WebSocket = class FakeWS {
			constructor(url) {
				createdUrls.push(url);
				this.url = url;
				this.readyState = 0;
				this.listeners = { open: [], message: [], close: [], error: [] };
				instances.push(this);
			}
			addEventListener(type, fn) { this.listeners[type].push(fn); }
			removeEventListener(type, fn) {
				this.listeners[type] = this.listeners[type].filter(f => f !== fn);
			}
			send() {}
			close() {
				this.readyState = 3;
				for (const fn of this.listeners.close) fn({});
			}
			emit(type, event) { for (const fn of this.listeners[type]) fn(event); }
		};
		globalThis.WebSocket.CLOSED = 3;
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		globalThis.WebSocket = OriginalWebSocket;
	});

	test('opens a socket immediately with the given URL', () => {
		createReconnectingClient({ url: 'wss://example/ws' });
		expect(createdUrls).toEqual(['wss://example/ws']);
	});

	test('calls onOpen when the socket opens', () => {
		let opened = false;
		createReconnectingClient({ url: 'wss://example/ws', onOpen: () => { opened = true; } });
		instances[0].emit('open', {});
		expect(opened).toBe(true);
	});

	test('reconnects with exponential backoff after an unexpected close', () => {
		createReconnectingClient({ url: 'wss://example/ws' });
		instances[0].emit('close', {});
		vi.advanceTimersByTime(499);
		expect(instances).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(instances).toHaveLength(2);
		instances[1].emit('close', {});
		vi.advanceTimersByTime(999);
		expect(instances).toHaveLength(2);
		vi.advanceTimersByTime(1);
		expect(instances).toHaveLength(3);
	});

	test('resets backoff after a successful open', () => {
		createReconnectingClient({ url: 'wss://example/ws' });
		instances[0].emit('close', {});
		vi.advanceTimersByTime(500);
		expect(instances).toHaveLength(2);
		instances[1].emit('open', {});
		instances[1].emit('close', {});
		vi.advanceTimersByTime(500);
		expect(instances).toHaveLength(3);
	});

	test('a custom backoff ramp is honored', () => {
		createReconnectingClient({ url: 'wss://example/ws', backoffs: [50, 100] });
		instances[0].emit('close', {});
		vi.advanceTimersByTime(50);
		expect(instances).toHaveLength(2);
		instances[1].emit('close', {});
		vi.advanceTimersByTime(100);
		expect(instances).toHaveLength(3);
	});

	test('does not reconnect after a manual close()', () => {
		const client = createReconnectingClient({ url: 'wss://example/ws' });
		client.close();
		vi.advanceTimersByTime(60_000);
		expect(instances).toHaveLength(1);
	});

	test('close() during a pending backoff cancels the reconnect', () => {
		const client = createReconnectingClient({ url: 'wss://example/ws' });
		instances[0].emit('close', {});
		// Advance partway through the initial 500 ms reconnect delay.
		vi.advanceTimersByTime(200);
		client.close();
		vi.advanceTimersByTime(60_000);
		expect(instances).toHaveLength(1);
	});

	test('caps backoff at the last ramp entry', () => {
		createReconnectingClient({ url: 'wss://example/ws' });
		for (let i = 0; i < 10; i++) {
			instances.at(-1).emit('close', {});
			vi.advanceTimersByTime(20_000);
		}
		const before = instances.length;
		instances.at(-1).emit('close', {});
		vi.advanceTimersByTime(15_000);
		expect(instances.length).toBeGreaterThan(before);
	});

	test('send goes through the live socket codec', () => {
		const sent = [];
		createReconnectingClient({ url: 'wss://example/ws' });
		instances[0].send = data => sent.push(data);
		const client = createReconnectingClient({ url: 'wss://example/ws' });
		instances[1].send = data => sent.push(data);
		client.send({ type: 'ping' });
		expect(sent).toEqual([JSON.stringify({ type: 'ping' })]);
	});
});

describe('createReconnectingClient with protocol', () => {
	let sockets;

	beforeEach(() => {
		sockets = [];
		vi.stubGlobal('WebSocket', function FakeWebSocket() {
			const sock = makeFakeSocket();
			sockets.push(sock);
			return sock;
		});
		vi.stubGlobal('WebSocket', Object.assign(globalThis.WebSocket, { CLOSED: 3 }));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	function readFrames(sock) {
		return sock.sent.map(raw => JSON.parse(raw));
	}

	test('sends a hello with null ids on a first connection', () => {
		createReconnectingClient({ url: 'ws://x', protocol: true });
		sockets[0].emit('open', {});
		expect(readFrames(sockets[0])).toEqual([
			[0, { type: 'hello', version: 1, clientId: null, sessionToken: null }],
		]);
	});

	test('frames outgoing game messages on channel 1', () => {
		const client = createReconnectingClient({ url: 'ws://x', protocol: true });
		sockets[0].emit('open', {});
		client.send({ type: 'shot' });
		expect(readFrames(sockets[0])[1]).toEqual([1, { type: 'shot' }]);
	});

	test('passes only channel 1 payloads to onMessage', () => {
		const seen = [];
		createReconnectingClient({ url: 'ws://x', protocol: true, onMessage: msg => seen.push(msg) });
		sockets[0].emit('open', {});
		sockets[0].emit('message', { data: JSON.stringify([1, { type: 'shot' }]) });
		sockets[0].emit('message', { data: JSON.stringify([0, { type: 'ping', t: 5 }]) });
		sockets[0].emit('message', { data: JSON.stringify([9, { type: 'future' }]) });
		expect(seen).toEqual([{ type: 'shot' }]);
	});

	test('answers a ping with a pong carrying the same timestamp', () => {
		createReconnectingClient({ url: 'ws://x', protocol: true });
		sockets[0].emit('open', {});
		sockets[0].emit('message', { data: JSON.stringify([0, { type: 'ping', t: 4242 }]) });
		expect(readFrames(sockets[0])[1]).toEqual([0, { type: 'pong', t: 4242 }]);
	});

	test('exposes the client id after the welcome', () => {
		const client = createReconnectingClient({ url: 'ws://x', protocol: true });
		sockets[0].emit('open', {});
		expect(client.clientId).toBe(null);
		sockets[0].emit('message', {
			data: JSON.stringify([0, { type: 'welcome', clientId: 'c-1', sessionToken: 't-1' }]),
		});
		expect(client.clientId).toBe('c-1');
	});

	test('onWelcome runs with the client id and resumed false on a first connection', () => {
		const seen = [];
		createReconnectingClient({ url: 'ws://x', protocol: true, onWelcome: w => seen.push(w) });
		sockets[0].emit('open', {});
		sockets[0].emit('message', {
			data: JSON.stringify([0, { type: 'welcome', clientId: 'c-1', sessionToken: 't-1' }]),
		});
		expect(seen).toEqual([{ clientId: 'c-1', resumed: false }]);
	});

	test('onWelcome reports resumed when the server keeps the same client id', () => {
		vi.useFakeTimers();
		const seen = [];
		createReconnectingClient({
			url: 'ws://x',
			protocol: true,
			backoffs: [10],
			onWelcome: w => seen.push(w),
		});
		sockets[0].emit('open', {});
		sockets[0].emit('message', {
			data: JSON.stringify([0, { type: 'welcome', clientId: 'c-1', sessionToken: 't-1' }]),
		});
		sockets[0].close();
		vi.advanceTimersByTime(10);
		sockets[1].emit('open', {});
		sockets[1].emit('message', {
			data: JSON.stringify([0, { type: 'welcome', clientId: 'c-1', sessionToken: 't-1' }]),
		});
		expect(seen).toEqual([
			{ clientId: 'c-1', resumed: false },
			{ clientId: 'c-1', resumed: true },
		]);
		vi.useRealTimers();
	});

	test('onWelcome reports a new session when the server issues a different client id', () => {
		vi.useFakeTimers();
		const seen = [];
		createReconnectingClient({
			url: 'ws://x',
			protocol: true,
			backoffs: [10],
			onWelcome: w => seen.push(w),
		});
		sockets[0].emit('open', {});
		sockets[0].emit('message', {
			data: JSON.stringify([0, { type: 'welcome', clientId: 'c-1', sessionToken: 't-1' }]),
		});
		sockets[0].close();
		vi.advanceTimersByTime(10);
		sockets[1].emit('open', {});
		sockets[1].emit('message', {
			data: JSON.stringify([0, { type: 'welcome', clientId: 'c-2', sessionToken: 't-2' }]),
		});
		expect(seen[1]).toEqual({ clientId: 'c-2', resumed: false });
		vi.useRealTimers();
	});

	test('stores the welcome ids in the identity', () => {
		const stored = {};
		const identity = {
			get: () => ({ clientId: null, sessionToken: null, name: null, ...stored }),
			set: fields => Object.assign(stored, fields),
			clear: () => {},
		};
		createReconnectingClient({ url: 'ws://x', protocol: true, identity });
		sockets[0].emit('open', {});
		sockets[0].emit('message', {
			data: JSON.stringify([0, { type: 'welcome', clientId: 'c-1', sessionToken: 't-1' }]),
		});
		expect(stored).toEqual({ clientId: 'c-1', sessionToken: 't-1' });
	});

	test('sends the stored ids in the hello on a reconnect', () => {
		const stored = { clientId: 'c-1', sessionToken: 't-1' };
		const identity = {
			get: () => ({ name: null, ...stored }),
			set: fields => Object.assign(stored, fields),
			clear: () => {},
		};
		createReconnectingClient({ url: 'ws://x', protocol: true, identity });
		sockets[0].emit('open', {});
		expect(readFrames(sockets[0])[0]).toEqual([
			0,
			{ type: 'hello', version: 1, clientId: 'c-1', sessionToken: 't-1' },
		]);
	});

	test('remembers the ids within the page when no identity is given', () => {
		vi.useFakeTimers();
		const client = createReconnectingClient({ url: 'ws://x', protocol: true, backoffs: [10] });
		sockets[0].emit('open', {});
		sockets[0].emit('message', {
			data: JSON.stringify([0, { type: 'welcome', clientId: 'c-9', sessionToken: 't-9' }]),
		});
		sockets[0].close();
		vi.advanceTimersByTime(10);
		sockets[1].emit('open', {});
		expect(readFrames(sockets[1])[0]).toEqual([
			0,
			{ type: 'hello', version: 1, clientId: 'c-9', sessionToken: 't-9' },
		]);
		vi.useRealTimers();
	});

	test('the socket handed to onOpen frames on the game channel', () => {
		createReconnectingClient({
			url: 'ws://x',
			protocol: true,
			onOpen: sock => sock.send({ type: 'ready' }),
		});
		sockets[0].emit('open', {});
		expect(readFrames(sockets[0])[1]).toEqual([1, { type: 'ready' }]);
	});

	test('a malformed frame reaches onError without closing the socket', () => {
		const errors = [];
		createReconnectingClient({ url: 'ws://x', protocol: true, onError: err => errors.push(err) });
		sockets[0].emit('open', {});
		sockets[0].emit('message', { data: JSON.stringify({ not: 'a frame' }) });
		expect(errors).toHaveLength(1);
		expect(sockets[0].readyState).toBe(1);
	});

	test('a permanent protocol close code stops the reconnection', () => {
		vi.useFakeTimers();
		for (const code of PERMANENT_CLOSE_CODES) {
			const closes = [];
			createReconnectingClient({
				url: 'ws://x',
				protocol: true,
				backoffs: [10],
				onClose: event => closes.push(event.code),
			});
			const opened = sockets.length;
			sockets.at(-1).emit('open', {});
			sockets.at(-1).close(code, 'permanent');
			vi.advanceTimersByTime(60_000);
			// onClose still runs, so the game can tell the player what happened.
			expect(closes).toEqual([code]);
			expect(sockets).toHaveLength(opened);
		}
	});

	test('an ordinary close still reconnects with protocol on', () => {
		vi.useFakeTimers();
		createReconnectingClient({ url: 'ws://x', protocol: true, backoffs: [10] });
		sockets[0].emit('open', {});
		sockets[0].close(1006, 'gone');
		vi.advanceTimersByTime(10);
		expect(sockets).toHaveLength(2);
	});

	test('without protocol a 4001 close still reconnects', () => {
		vi.useFakeTimers();
		createReconnectingClient({ url: 'ws://x', backoffs: [10] });
		sockets[0].emit('open', {});
		sockets[0].close(CLOSE_VERSION, 'permanent');
		vi.advanceTimersByTime(10);
		expect(sockets).toHaveLength(2);
	});

	test('without protocol the client sends and receives raw, as it does today', () => {
		const seen = [];
		const client = createReconnectingClient({ url: 'ws://x', onMessage: msg => seen.push(msg) });
		sockets[0].emit('open', {});
		client.send({ type: 'shot' });
		sockets[0].emit('message', { data: JSON.stringify({ type: 'welcome' }) });
		expect(readFrames(sockets[0])).toEqual([{ type: 'shot' }]);
		expect(seen).toEqual([{ type: 'welcome' }]);
	});
});
