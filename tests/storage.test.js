import { describe, test, expect } from 'vitest';
import { createStorage } from '../src/storage.js';

describe('createStorage', () => {
	test('set then get returns the same value', () => {
		const storage = createStorage('game');
		storage.set('theme', 'dark');
		expect(storage.get('theme')).toBe('dark');
	});

	test('get returns default when key is missing', () => {
		const storage = createStorage('game');
		expect(storage.get('missing', 'fallback')).toBe('fallback');
	});

	test('non-string types round-trip', () => {
		const storage = createStorage('game');
		storage.set('count', 42);
		storage.set('flag', true);
		storage.set('obj', { a: 1, b: [2, 3] });
		expect(storage.get('count')).toBe(42);
		expect(storage.get('flag')).toBe(true);
		expect(storage.get('obj')).toEqual({ a: 1, b: [2, 3] });
	});

	test('remove deletes a key', () => {
		const storage = createStorage('game');
		storage.set('temp', 'value');
		storage.remove('temp');
		expect(storage.get('temp', null)).toBe(null);
	});

	test('keys are namespaced', () => {
		const storage = createStorage('airhockey');
		storage.set('foo', 'bar');
		expect(localStorage.getItem('airhockey:foo')).toBe('"bar"');
	});

	test('two namespaces do not collide', () => {
		const a = createStorage('alpha');
		const b = createStorage('beta');
		a.set('key', 'from-alpha');
		b.set('key', 'from-beta');
		expect(a.get('key')).toBe('from-alpha');
		expect(b.get('key')).toBe('from-beta');
	});

	test('get returns default when the stored value is not valid JSON', () => {
		const storage = createStorage('game');
		localStorage.setItem('game:broken', '{not json');
		expect(storage.get('broken', 'fallback')).toBe('fallback');
	});

	test('accepts an injected backend', () => {
		const store = new Map();
		const backend = {
			getItem: key => (store.has(key) ? store.get(key) : null),
			setItem: (key, value) => store.set(key, value),
			removeItem: key => store.delete(key),
		};
		const storage = createStorage('game', { backend });
		storage.set('key', 'value');
		expect(store.get('game:key')).toBe('"value"');
		expect(storage.get('key')).toBe('value');
		expect(localStorage.getItem('game:key')).toBe(null);
	});

	test('requires a namespace', () => {
		expect(() => createStorage()).toThrow();
		expect(() => createStorage('')).toThrow();
	});
});
