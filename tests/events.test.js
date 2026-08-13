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
});
