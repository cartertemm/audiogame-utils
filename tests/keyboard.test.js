import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createKeyboard } from '../src/input/keyboard.js';

function dispatchKey(type, key, options = {}) {
	window.dispatchEvent(new KeyboardEvent(type, { key, ...options }));
}

describe('createKeyboard', () => {
	let keyboard;

	beforeEach(() => {
		keyboard = createKeyboard();
	});

	afterEach(() => {
		keyboard.dispose();
	});

	test('isDown returns false before any key is pressed', () => {
		expect(keyboard.isDown('a')).toBe(false);
	});

	test('isDown returns true after keydown', () => {
		dispatchKey('keydown', 'a');
		expect(keyboard.isDown('a')).toBe(true);
	});

	test('isDown returns false after keyup', () => {
		dispatchKey('keydown', 'a');
		dispatchKey('keyup', 'a');
		expect(keyboard.isDown('a')).toBe(false);
	});

	test('keys are normalized to lowercase', () => {
		dispatchKey('keydown', 'A');
		expect(keyboard.isDown('a')).toBe(true);
		expect(keyboard.isDown('A')).toBe(true);
	});

	test('arrow keys tracked', () => {
		dispatchKey('keydown', 'ArrowLeft');
		expect(keyboard.isDown('arrowleft')).toBe(true);
	});

	test('on(keydown) handler fires on keydown', () => {
		const calls = [];
		keyboard.on('keydown', e => calls.push(e.key));
		dispatchKey('keydown', 'b');
		expect(calls).toEqual(['b']);
	});

	test('on(keypress) fires once per non-repeat keydown', () => {
		const calls = [];
		keyboard.on('keypress', e => calls.push(e.key));
		dispatchKey('keydown', 'c', { repeat: false });
		dispatchKey('keydown', 'c', { repeat: true });
		dispatchKey('keydown', 'c', { repeat: true });
		expect(calls).toEqual(['c']);
	});

	test('off removes a handler', () => {
		const calls = [];
		const handler = e => calls.push(e.key);
		keyboard.on('keydown', handler);
		keyboard.off('keydown', handler);
		dispatchKey('keydown', 'd');
		expect(calls).toEqual([]);
	});

	test('dispose stops tracking', () => {
		keyboard.dispose();
		dispatchKey('keydown', 'a');
		expect(keyboard.isDown('a')).toBe(false);
	});

	test('two instances are independent', () => {
		const other = createKeyboard();
		dispatchKey('keydown', 'a');
		expect(keyboard.isDown('a')).toBe(true);
		expect(other.isDown('a')).toBe(true);
		other.dispose();
		dispatchKey('keydown', 'b');
		expect(keyboard.isDown('b')).toBe(true);
		expect(other.isDown('b')).toBe(false);
	});
});
