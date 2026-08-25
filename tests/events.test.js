import { describe, test, expect } from 'vitest';
import { EventEmitter } from '../src/events.js';

describe('EventEmitter', () => {
	test('fires handler on emit', () => {
		const ee = new EventEmitter();
		let received;
		ee.on('foo', data => { received = data; });
		ee.emit('foo', { x: 1 });
		expect(received).toEqual({ x: 1 });
	});

	test('fires all handlers for an event', () => {
		const ee = new EventEmitter();
		const calls = [];
		ee.on('foo', () => calls.push('a'));
		ee.on('foo', () => calls.push('b'));
		ee.emit('foo');
		expect(calls).toEqual(['a', 'b']);
	});

	test('off removes a specific handler', () => {
		const ee = new EventEmitter();
		const calls = [];
		const handler = () => calls.push('a');
		ee.on('foo', handler);
		ee.off('foo', handler);
		ee.emit('foo');
		expect(calls).toHaveLength(0);
	});

	test('off does not affect other handlers', () => {
		const ee = new EventEmitter();
		const calls = [];
		const a = () => calls.push('a');
		const b = () => calls.push('b');
		ee.on('foo', a);
		ee.on('foo', b);
		ee.off('foo', a);
		ee.emit('foo');
		expect(calls).toEqual(['b']);
	});

	test('emit on unknown event does not throw', () => {
		const ee = new EventEmitter();
		expect(() => ee.emit('unknown')).not.toThrow();
	});

	test('off on unknown event does not throw', () => {
		const ee = new EventEmitter();
		expect(() => ee.off('unknown', () => {})).not.toThrow();
	});

	test('handlers for different events do not cross-fire', () => {
		const ee = new EventEmitter();
		const calls = [];
		ee.on('foo', () => calls.push('foo'));
		ee.on('bar', () => calls.push('bar'));
		ee.emit('foo');
		expect(calls).toEqual(['foo']);
	});

	test('on returns an unbind function', () => {
		const ee = new EventEmitter();
		const calls = [];
		const unbind = ee.on('foo', () => calls.push('a'));
		ee.emit('foo');
		expect(calls).toEqual(['a']);
		unbind();
		ee.emit('foo');
		expect(calls).toEqual(['a']);
	});

	test('once fires handler only once', () => {
		const ee = new EventEmitter();
		const calls = [];
		ee.once('foo', data => calls.push(data));
		ee.emit('foo', 1);
		ee.emit('foo', 2);
		expect(calls).toEqual([1]);
		expect(ee.listenerCount('foo')).toBe(0);
	});

	test('once unbind function cancels listener before emit', () => {
		const ee = new EventEmitter();
		const calls = [];
		const unbind = ee.once('foo', () => calls.push('a'));
		unbind();
		ee.emit('foo');
		expect(calls).toHaveLength(0);
	});

	test('off without handler removes all listeners for event', () => {
		const ee = new EventEmitter();
		const calls = [];
		ee.on('foo', () => calls.push('a'));
		ee.on('foo', () => calls.push('b'));
		ee.off('foo');
		ee.emit('foo');
		expect(calls).toHaveLength(0);
		expect(ee.listenerCount('foo')).toBe(0);
	});

	test('listenerCount returns the number of active listeners', () => {
		const ee = new EventEmitter();
		expect(ee.listenerCount('foo')).toBe(0);
		const unbind1 = ee.on('foo', () => {});
		const unbind2 = ee.on('foo', () => {});
		expect(ee.listenerCount('foo')).toBe(2);
		unbind1();
		expect(ee.listenerCount('foo')).toBe(1);
		unbind2();
		expect(ee.listenerCount('foo')).toBe(0);
	});

	test('emit executes all handlers even if one throws and rethrows error', () => {
		const ee = new EventEmitter();
		const calls = [];
		ee.on('foo', () => {
			calls.push('first');
			throw new Error('handler failed');
		});
		ee.on('foo', () => {
			calls.push('second');
		});
		expect(() => ee.emit('foo')).toThrow('handler failed');
		expect(calls).toEqual(['first', 'second']);
	});
});
