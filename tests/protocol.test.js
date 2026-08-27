import { describe, test, expect } from 'vitest';
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
} from '../src/net/protocol.js';

describe('protocol constants', () => {
	test('exposes the wire version and the two channels', () => {
		expect(PROTOCOL_VERSION).toBe(1);
		expect(CHANNEL_PROTOCOL).toBe(0);
		expect(CHANNEL_GAME).toBe(1);
	});

	test('exposes the protocol message names', () => {
		expect([HELLO, WELCOME, PING, PONG]).toEqual(['hello', 'welcome', 'ping', 'pong']);
	});

	test('exposes the four close codes', () => {
		expect([CLOSE_VERSION, CLOSE_REPLACED, CLOSE_UNGREETED, CLOSE_MALFORMED])
			.toEqual([4001, 4002, 4003, 4004]);
	});
});

describe('frame', () => {
	test('pairs a channel with a payload', () => {
		expect(frame(CHANNEL_GAME, { type: 'shot' })).toEqual([1, { type: 'shot' }]);
	});

	test('accepts a payload that is not an object', () => {
		expect(frame(CHANNEL_GAME, 42)).toEqual([1, 42]);
		expect(frame(CHANNEL_GAME, 'hi')).toEqual([1, 'hi']);
		expect(frame(CHANNEL_GAME, [1, 2, 3])).toEqual([1, [1, 2, 3]]);
	});
});

describe('readFrame', () => {
	test('splits a well formed frame', () => {
		expect(readFrame([0, { type: 'ping' }])).toEqual({ channel: 0, payload: { type: 'ping' } });
	});

	test('returns a payload of null or undefined without rejecting the frame', () => {
		expect(readFrame([1, null])).toEqual({ channel: 1, payload: null });
		expect(readFrame([1, undefined])).toEqual({ channel: 1, payload: undefined });
	});

	test('rejects anything that is not a two element array', () => {
		expect(readFrame(null)).toBeNull();
		expect(readFrame('hello')).toBeNull();
		expect(readFrame({ channel: 1 })).toBeNull();
		expect(readFrame([])).toBeNull();
		expect(readFrame([1])).toBeNull();
		expect(readFrame([1, 2, 3])).toBeNull();
	});

	test('rejects a non numeric channel', () => {
		expect(readFrame(['0', { type: 'ping' }])).toBeNull();
	});
});
