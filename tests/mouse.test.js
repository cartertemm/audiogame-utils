import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createMouse } from '../src/input/mouse.js';

function dispatchMouse(type, { x = 0, y = 0, button = 0 } = {}) {
	window.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, button }));
}

describe('createMouse', () => {
	let mouse;

	beforeEach(() => {
		mouse = createMouse();
	});

	afterEach(() => {
		mouse.dispose();
	});

	test('button starts up and position starts at origin', () => {
		expect(mouse.isButtonDown()).toBe(false);
		expect(mouse.getPosition()).toEqual({ x: 0, y: 0 });
	});

	test('tracks left button down and up', () => {
		dispatchMouse('mousedown', { x: 10, y: 20 });
		expect(mouse.isButtonDown()).toBe(true);
		dispatchMouse('mouseup', { x: 10, y: 20 });
		expect(mouse.isButtonDown()).toBe(false);
	});

	test('ignores non-left buttons', () => {
		dispatchMouse('mousedown', { x: 5, y: 5, button: 2 });
		expect(mouse.isButtonDown()).toBe(false);
	});

	test('tracks position on move', () => {
		dispatchMouse('mousemove', { x: 42, y: 99 });
		expect(mouse.getPosition()).toEqual({ x: 42, y: 99 });
	});

	test('getPosition returns a copy', () => {
		dispatchMouse('mousemove', { x: 1, y: 2 });
		const pos = mouse.getPosition();
		pos.x = 999;
		expect(mouse.getPosition().x).toBe(1);
	});

	test('handlers fire with coordinates', () => {
		const moves = [];
		mouse.on('mousemove', p => moves.push(p));
		dispatchMouse('mousemove', { x: 7, y: 8 });
		expect(moves).toEqual([{ x: 7, y: 8 }]);
	});

	test('off removes a handler', () => {
		const calls = [];
		const handler = () => calls.push(1);
		mouse.on('mousedown', handler);
		mouse.off('mousedown', handler);
		dispatchMouse('mousedown');
		expect(calls).toHaveLength(0);
	});

	test('dispose stops tracking', () => {
		mouse.dispose();
		dispatchMouse('mousemove', { x: 50, y: 50 });
		expect(mouse.getPosition()).toEqual({ x: 0, y: 0 });
	});
});
