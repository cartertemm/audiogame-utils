import { describe, test, expect } from 'vitest';
import { createSocketPair } from '../src/net/testing.js';

describe('createSocketPair', () => {
	test('delivers a send on one end as a message on the other', () => {
		const [a, b] = createSocketPair();
		const seen = [];
		b.addEventListener('message', event => seen.push(event.data));
		a.send('hello');
		expect(seen).toEqual(['hello']);
	});

	test('delivers synchronously, with no timers involved', () => {
		const [a, b] = createSocketPair();
		let delivered = false;
		b.addEventListener('message', () => { delivered = true; });
		a.send('x');
		expect(delivered).toBe(true);
	});

	test('records what each end sent', () => {
		const [a, b] = createSocketPair();
		a.send('one');
		a.send('two');
		expect(a.sent).toEqual(['one', 'two']);
		expect(b.sent).toEqual([]);
	});

	test('starts open and reports closed after close', () => {
		const [a, b] = createSocketPair();
		expect(a.readyState).toBe(1);
		a.close();
		expect(a.readyState).toBe(3);
		expect(b.readyState).toBe(3);
	});

	test('closing one end fires close on both, with the code and reason', () => {
		const [a, b] = createSocketPair();
		const events = [];
		a.addEventListener('close', event => events.push(['a', event.code, event.reason]));
		b.addEventListener('close', event => events.push(['b', event.code, event.reason]));
		a.close(4001, 'nope');
		expect(events).toEqual([
			['a', 4001, 'nope'],
			['b', 4001, 'nope'],
		]);
	});

	test('closing twice fires close once', () => {
		const [a] = createSocketPair();
		let count = 0;
		a.addEventListener('close', () => { count += 1; });
		a.close();
		a.close();
		expect(count).toBe(1);
	});

	test('a send after close is discarded', () => {
		const [a, b] = createSocketPair();
		const seen = [];
		b.addEventListener('message', event => seen.push(event.data));
		a.close();
		a.send('too late');
		expect(seen).toEqual([]);
		expect(a.sent).toEqual([]);
	});

	test('removeEventListener stops delivery', () => {
		const [a, b] = createSocketPair();
		const seen = [];
		const handler = event => seen.push(event.data);
		b.addEventListener('message', handler);
		b.removeEventListener('message', handler);
		a.send('x');
		expect(seen).toEqual([]);
	});

	test('emit drives an event by hand', () => {
		const [a] = createSocketPair();
		const seen = [];
		a.addEventListener('error', event => seen.push(event));
		a.emit('error', new Error('boom'));
		expect(seen).toHaveLength(1);
	});
});
