import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createKeyboard } from '../src/input/keyboard.js';
import { createTouch } from '../src/input/touch.js';
import { createInputHandler } from '../src/input/inputHandler.js';
import { formatBinding } from '../src/input/format.js';

function dispatchKey(type, key, options = {}) {
	window.dispatchEvent(new KeyboardEvent(type, { key, ...options }));
}

function makeTouch(id, x, y) {
	return { identifier: id, clientX: x, clientY: y };
}

function dispatchTouch(type, touches, changedTouches) {
	const event = new Event(type, { bubbles: true, cancelable: true });
	event.touches = touches;
	event.changedTouches = changedTouches ?? touches;
	event.preventDefault = () => {};
	document.body.dispatchEvent(event);
}

describe('createInputHandler', () => {
	let keyboard;
	let touch;
	let handler;

	beforeEach(() => {
		keyboard = createKeyboard();
		touch = createTouch({ multiTapWindow: 20 });
		handler = createInputHandler({ keyboard, touch });
	});

	afterEach(() => {
		handler?.dispose();
		touch.dispose();
		keyboard.dispose();
	});

	test('construction auto-attaches by default', () => {
		expect(handler.attached).toBe(true);
	});

	test('construction with {attach: false} does not attach', () => {
		handler.detach();
		handler = createInputHandler({ keyboard, touch, attach: false });
		expect(handler.attached).toBe(false);
	});

	test('wasTriggered for hold returns true while key is down', () => {
		handler.bind('moveLeft', { hold: ['arrowleft'] });
		expect(handler.wasTriggered('moveLeft')).toBe(false);
		dispatchKey('keydown', 'ArrowLeft');
		expect(handler.wasTriggered('moveLeft')).toBe(true);
		dispatchKey('keyup', 'ArrowLeft');
		expect(handler.wasTriggered('moveLeft')).toBe(false);
	});

	test('wasTriggered for press consumes pending event on read', () => {
		handler.bind('shoot', { press: [' '] });
		dispatchKey('keydown', ' ');
		expect(handler.wasTriggered('shoot')).toBe(true);
		expect(handler.wasTriggered('shoot')).toBe(false);
		dispatchKey('keyup', ' ');
		dispatchKey('keydown', ' ');
		expect(handler.wasTriggered('shoot')).toBe(true);
	});

	test('wasTriggered for tap with matching fingerCount and tapCount', async () => {
		handler.bind('doubleTap', { tap: [{ fingerCount: 1, tapCount: 2 }] });
		dispatchTouch('touchstart', [makeTouch(1, 100, 100)]);
		dispatchTouch('touchend', [], [makeTouch(1, 100, 100)]);
		await new Promise(r => setTimeout(r, 5));
		dispatchTouch('touchstart', [makeTouch(2, 101, 101)]);
		dispatchTouch('touchend', [], [makeTouch(2, 101, 101)]);
		await new Promise(r => setTimeout(r, 30));
		expect(handler.wasTriggered('doubleTap')).toBe(true);
	});

	test('wasTriggered for tap with wildcarded fingerCount', async () => {
		handler.bind('anyTap', { tap: [{}] });
		dispatchTouch('touchstart', [makeTouch(1, 100, 100), makeTouch(2, 150, 100)]);
		dispatchTouch('touchend', [], [makeTouch(1, 100, 100), makeTouch(2, 150, 100)]);
		await new Promise(r => setTimeout(r, 30));
		expect(handler.wasTriggered('anyTap')).toBe(true);
	});

	test('wasTriggered for swipe with direction match', async () => {
		handler.bind('swipeLeft', { swipe: [{ direction: 'left' }] });
		dispatchTouch('touchstart', [makeTouch(1, 200, 100)]);
		await new Promise(r => setTimeout(r, 20));
		dispatchTouch('touchend', [], [makeTouch(1, 100, 102)]);
		expect(handler.wasTriggered('swipeLeft')).toBe(true);
	});

	test('on(name, handler) fires on press, tap, and swipe matches', async () => {
		handler.bind('shoot', {
			press: [' '],
			tap: [{ fingerCount: 1, tapCount: 1 }],
			swipe: [{ direction: 'right' }],
		});
		const events = [];
		handler.on('shoot', e => events.push(e));

		dispatchKey('keydown', ' ');
		expect(events.length).toBe(1);
		expect(events[0]).toEqual({ name: 'shoot' });

		dispatchTouch('touchstart', [makeTouch(1, 100, 100)]);
		dispatchTouch('touchend', [], [makeTouch(1, 100, 100)]);
		await new Promise(r => setTimeout(r, 30));
		expect(events.length).toBe(2);

		dispatchTouch('touchstart', [makeTouch(2, 100, 100)]);
		await new Promise(r => setTimeout(r, 20));
		dispatchTouch('touchend', [], [makeTouch(2, 200, 102)]);
		expect(events.length).toBe(3);
		expect(events[2]).toEqual({ name: 'shoot' });
	});

	test('off removes a handler', () => {
		handler.bind('shoot', { press: [' '] });
		const calls = [];
		const fn = () => calls.push(1);
		handler.on('shoot', fn);
		handler.off('shoot', fn);
		dispatchKey('keydown', ' ');
		expect(calls.length).toBe(0);
	});

	test('multiple bindings for one action: either source fires it', async () => {
		handler.bind('shoot', {
			press: [' '],
			tap: [{ fingerCount: 1, tapCount: 2 }],
		});

		dispatchKey('keydown', ' ');
		expect(handler.wasTriggered('shoot')).toBe(true);

		dispatchTouch('touchstart', [makeTouch(1, 100, 100)]);
		dispatchTouch('touchend', [], [makeTouch(1, 100, 100)]);
		await new Promise(r => setTimeout(r, 5));
		dispatchTouch('touchstart', [makeTouch(2, 101, 101)]);
		dispatchTouch('touchend', [], [makeTouch(2, 101, 101)]);
		await new Promise(r => setTimeout(r, 30));
		expect(handler.wasTriggered('shoot')).toBe(true);
	});

	test('bind replaces the prior binding for the same name', () => {
		handler.bind('action', { press: ['a'] });
		handler.bind('action', { press: ['b'] });

		dispatchKey('keydown', 'a');
		expect(handler.wasTriggered('action')).toBe(false);
		dispatchKey('keydown', 'b');
		expect(handler.wasTriggered('action')).toBe(true);
	});

	test('unbind removes the binding and handlers', () => {
		handler.bind('action', { press: ['a'] });
		const calls = [];
		handler.on('action', () => calls.push(1));
		handler.unbind('action');
		dispatchKey('keydown', 'a');
		expect(calls.length).toBe(0);
		expect(handler.wasTriggered('action')).toBe(false);
	});

	test('detach stops event dispatch and forces wasTriggered to false', () => {
		handler.bind('moveLeft', { hold: ['arrowleft'] });
		handler.bind('shoot', { press: [' '] });
		dispatchKey('keydown', 'ArrowLeft');
		expect(handler.wasTriggered('moveLeft')).toBe(true);

		handler.detach();
		expect(handler.attached).toBe(false);
		expect(handler.wasTriggered('moveLeft')).toBe(false);

		dispatchKey('keydown', ' ');
		handler.attach();
		expect(handler.wasTriggered('shoot')).toBe(false);
	});

	test('attach after detach resumes dispatch without re-binding', () => {
		handler.bind('shoot', { press: [' '] });
		handler.detach();
		handler.attach();
		expect(handler.attached).toBe(true);
		dispatchKey('keydown', ' ');
		expect(handler.wasTriggered('shoot')).toBe(true);
	});

	test('two instances coexist with independent bindings', async () => {
		const a = createInputHandler({ keyboard, touch });
		const b = createInputHandler({ keyboard, touch });
		try {
			a.bind('actA', { press: ['a'] });
			b.bind('actB', { press: ['b'] });

			dispatchKey('keydown', 'a');
			expect(a.wasTriggered('actA')).toBe(true);
			expect(b.wasTriggered('actB')).toBe(false);

			dispatchKey('keyup', 'a');
			dispatchKey('keydown', 'b');
			expect(a.wasTriggered('actA')).toBe(false);
			expect(b.wasTriggered('actB')).toBe(true);

			a.detach();
			dispatchKey('keyup', 'b');
			dispatchKey('keydown', 'b');
			expect(b.wasTriggered('actB')).toBe(true);
			expect(a.wasTriggered('actA')).toBe(false);
		} finally {
			a.dispose();
			b.dispose();
		}
	});

	test('describe(name) returns the structured shape for one action', () => {
		handler.bind('shoot', {
			press: [' '],
			tap: [{ fingerCount: 1, tapCount: 2 }],
		});
		const desc = handler.describe('shoot');
		expect(desc).toEqual({
			name: 'shoot',
			bindings: [
				{ kind: 'press', key: ' ' },
				{ kind: 'tap', fingerCount: 1, tapCount: 2 },
			],
		});
		expect(handler.describe('nope')).toBe(null);
	});

	test('describe() returns all bound actions', () => {
		handler.bind('moveLeft', { hold: ['arrowleft'] });
		handler.bind('menuBack', { press: ['escape'], swipe: [{ direction: 'left', fingerCount: 2 }] });
		const all = handler.describe();
		expect(Array.isArray(all)).toBe(true);
		expect(all.length).toBe(2);
		const moveLeft = all.find(a => a.name === 'moveLeft');
		const menuBack = all.find(a => a.name === 'menuBack');
		expect(moveLeft).toEqual({
			name: 'moveLeft',
			bindings: [{ kind: 'hold', key: 'arrowleft' }],
		});
		expect(menuBack).toEqual({
			name: 'menuBack',
			bindings: [
				{ kind: 'press', key: 'escape' },
				{ kind: 'swipe', direction: 'left', fingerCount: 2 },
			],
		});
	});
});

describe('formatBinding', () => {
	test('hold and press format regular keys with capital first letter', () => {
		expect(formatBinding({ kind: 'hold', key: 'a' })).toBe('A');
		expect(formatBinding({ kind: 'press', key: 'w' })).toBe('W');
	});

	test('space is labeled "Space"', () => {
		expect(formatBinding({ kind: 'press', key: ' ' })).toBe('Space');
	});

	test('arrow keys get a readable label', () => {
		expect(formatBinding({ kind: 'hold', key: 'arrowleft' })).toBe('Arrow Left');
		expect(formatBinding({ kind: 'hold', key: 'arrowright' })).toBe('Arrow Right');
		expect(formatBinding({ kind: 'hold', key: 'arrowup' })).toBe('Arrow Up');
		expect(formatBinding({ kind: 'hold', key: 'arrowdown' })).toBe('Arrow Down');
	});

	test('escape and enter get readable labels', () => {
		expect(formatBinding({ kind: 'press', key: 'escape' })).toBe('Escape');
		expect(formatBinding({ kind: 'press', key: 'enter' })).toBe('Enter');
	});

	test('tap formats based on finger and tap count', () => {
		expect(formatBinding({ kind: 'tap', fingerCount: 1, tapCount: 1 })).toBe('Tap');
		expect(formatBinding({ kind: 'tap', fingerCount: 1, tapCount: 2 })).toBe('Double tap');
		expect(formatBinding({ kind: 'tap', fingerCount: 1, tapCount: 3 })).toBe('Triple tap');
		expect(formatBinding({ kind: 'tap', fingerCount: 3, tapCount: 1 })).toBe('Three finger tap');
		expect(formatBinding({ kind: 'tap', fingerCount: 2, tapCount: 2 })).toBe('Two finger double tap');
		expect(formatBinding({ kind: 'tap' })).toBe('Tap');
	});

	test('swipe formats with finger prefix and direction', () => {
		expect(formatBinding({ kind: 'swipe', direction: 'up', fingerCount: 1 })).toBe('Swipe up');
		expect(formatBinding({ kind: 'swipe', direction: 'up', fingerCount: 3 })).toBe('Three finger swipe up');
		expect(formatBinding({ kind: 'swipe', direction: 'down' })).toBe('Swipe down');
	});
});
