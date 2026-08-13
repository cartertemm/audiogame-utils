import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { wrapSocket, createReconnectingClient } from '../src/net/transport.js';

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
