import { describe, test, expect, afterEach } from 'vitest';
import { createGamepad } from '../src/input/gamepad.js';
import { createInputHandler } from '../src/input/inputHandler.js';
import { formatBinding } from '../src/input/format.js';

describe('createGamepad', () => {
	let originalNavigator;

	function mockNavigator(pads = []) {
		originalNavigator = globalThis.navigator;
		Object.defineProperty(globalThis, 'navigator', {
			value: { getGamepads: () => pads },
			writable: true,
			configurable: true,
		});
	}

	afterEach(() => {
		if (originalNavigator !== undefined) {
			Object.defineProperty(globalThis, 'navigator', {
				value: originalNavigator,
				writable: true,
				configurable: true,
			});
		}
	});

	test('isDown returns true for pressed buttons', () => {
		const fakePad = {
			index: 0,
			buttons: [{ pressed: true }, { pressed: false }],
			axes: [0, 0],
		};
		mockNavigator([fakePad]);

		const gamepad = createGamepad();
		gamepad.poll();
		expect(gamepad.isDown(0)).toBe(true);
		expect(gamepad.isDown('a')).toBe(true);
		expect(gamepad.isDown(1)).toBe(false);
		expect(gamepad.isDown('b')).toBe(false);
	});

	test('pressed and released report discrete state changes', () => {
		const fakePad1 = {
			index: 0,
			buttons: [{ pressed: true }, { pressed: false }],
			axes: [0, 0],
		};
		mockNavigator([fakePad1]);

		const gamepad = createGamepad();
		gamepad.poll();
		expect(gamepad.pressed('a')).toBe(true);
		expect(gamepad.released('a')).toBe(false);

		gamepad.poll();
		expect(gamepad.pressed('a')).toBe(false);
		expect(gamepad.isDown('a')).toBe(true);

		const fakePad2 = {
			index: 0,
			buttons: [{ pressed: false }, { pressed: false }],
			axes: [0, 0],
		};
		mockNavigator([fakePad2]);
		gamepad.poll();
		expect(gamepad.pressed('a')).toBe(false);
		expect(gamepad.released('a')).toBe(true);
		expect(gamepad.isDown('a')).toBe(false);
	});

	test('getAxis applies deadzone threshold', () => {
		const fakePad = {
			index: 0,
			buttons: [],
			axes: [0.1, 0.8, -0.5],
		};
		mockNavigator([fakePad]);

		const gamepad = createGamepad({ deadzone: 0.25 });
		expect(gamepad.getAxis(0)).toBe(0);
		expect(gamepad.getAxis(1)).toBe(0.8);
		expect(gamepad.getAxis(2)).toBe(-0.5);
	});

	test('dispatches buttonpress and buttonrelease events', () => {
		const fakePad = {
			index: 0,
			buttons: [{ pressed: true }],
			axes: [],
		};
		mockNavigator([fakePad]);

		const gamepad = createGamepad();
		const pressCalls = [];
		gamepad.on('buttonpress', e => pressCalls.push(e.button));

		gamepad.poll();
		expect(pressCalls).toEqual([0]);
	});

	test('binds gamepad buttons by alias name', () => {
		const fakePad = {
			index: 0,
			buttons: [{ pressed: false }, { pressed: false }, { pressed: false }, { pressed: false },
				{ pressed: false }, { pressed: false }, { pressed: false }, { pressed: false },
				{ pressed: false }, { pressed: false }, { pressed: false }, { pressed: false },
				{ pressed: true }],
			axes: [],
		};
		mockNavigator([fakePad]);

		const gamepad = createGamepad();
		const handler = createInputHandler({ gamepad });
		const fired = [];
		handler.bind('forward', { gamepad: ['dpad_up'] });
		handler.on('forward', e => fired.push(e.name));

		gamepad.poll();
		expect(fired).toEqual(['forward']);
		expect(handler.wasTriggered('forward')).toBe(true);
	});

	test('describes and formats alias bindings by their standard name', () => {
		const handler = createInputHandler({});
		handler.bind('forward', { gamepad: ['dpad_up'] });

		const described = handler.describe('forward');
		expect(described.bindings).toEqual([{ kind: 'gamepad', button: 12 }]);
		expect(formatBinding(described.bindings[0])).toBe('Gamepad D-Pad Up');
		expect(formatBinding({ kind: 'gamepad', button: 'leftstick' })).toBe('Gamepad L3');
	});

	test('integrates with createInputHandler', () => {
		const fakePad = {
			index: 0,
			buttons: [{ pressed: true }],
			axes: [],
		};
		mockNavigator([fakePad]);

		const gamepad = createGamepad();
		const handler = createInputHandler({ gamepad });
		handler.bind('jump', { gamepad: [0] });

		gamepad.poll();
		expect(handler.wasTriggered('jump')).toBe(true);
	});
});
