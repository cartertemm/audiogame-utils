import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createTouch } from '../src/input/touch.js';

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

describe('createTouch', () => {
	let touch;

	beforeEach(() => {
		touch = createTouch();
	});

	afterEach(() => {
		touch.dispose();
	});

	test('fingerCount is 0 initially', () => {
		expect(touch.fingerCount()).toBe(0);
	});

	test('fingerCount tracks touchstart and touchend', () => {
		dispatchTouch('touchstart', [makeTouch(1, 100, 100)]);
		expect(touch.fingerCount()).toBe(1);
		dispatchTouch('touchstart', [makeTouch(1, 100, 100), makeTouch(2, 200, 200)]);
		expect(touch.fingerCount()).toBe(2);
		dispatchTouch('touchend', [makeTouch(1, 100, 100)], [makeTouch(2, 200, 200)]);
		expect(touch.fingerCount()).toBe(1);
	});

	test('getFinger returns finger position', () => {
		dispatchTouch('touchstart', [makeTouch(1, 50, 75)]);
		const f = touch.getFinger(0);
		expect(f.x).toBe(50);
		expect(f.y).toBe(75);
		expect(f.id).toBe(1);
	});

	test('tap event fires for short, close-to-stationary touch', async () => {
		touch.dispose();
		touch = createTouch({ multiTapWindow: 20 });
		const taps = [];
		touch.on('tap', e => taps.push(e));
		dispatchTouch('touchstart', [makeTouch(1, 100, 100)]);
		await new Promise(r => setTimeout(r, 30));
		dispatchTouch('touchend', [], [makeTouch(1, 102, 101)]);
		await new Promise(r => setTimeout(r, 30));
		expect(taps.length).toBe(1);
		expect(taps[0].x).toBe(102);
		expect(taps[0].y).toBe(101);
		expect(taps[0].fingerCount).toBe(1);
		expect(taps[0].tapCount).toBe(1);
	});

	test('swipe right detected', async () => {
		const swipes = [];
		touch.on('swipe', e => swipes.push(e));
		dispatchTouch('touchstart', [makeTouch(1, 100, 100)]);
		await new Promise(r => setTimeout(r, 50));
		dispatchTouch('touchend', [], [makeTouch(1, 200, 105)]);
		expect(swipes.length).toBe(1);
		expect(swipes[0].direction).toBe('right');
		expect(swipes[0].fingerCount).toBe(1);
	});

	test('swipe left detected', async () => {
		const swipes = [];
		touch.on('swipe', e => swipes.push(e));
		dispatchTouch('touchstart', [makeTouch(1, 200, 100)]);
		await new Promise(r => setTimeout(r, 50));
		dispatchTouch('touchend', [], [makeTouch(1, 100, 102)]);
		expect(swipes[0].direction).toBe('left');
	});

	test('swipe up detected', async () => {
		const swipes = [];
		touch.on('swipe', e => swipes.push(e));
		dispatchTouch('touchstart', [makeTouch(1, 100, 200)]);
		await new Promise(r => setTimeout(r, 50));
		dispatchTouch('touchend', [], [makeTouch(1, 102, 100)]);
		expect(swipes[0].direction).toBe('up');
	});

	test('swipe down detected', async () => {
		const swipes = [];
		touch.on('swipe', e => swipes.push(e));
		dispatchTouch('touchstart', [makeTouch(1, 100, 100)]);
		await new Promise(r => setTimeout(r, 50));
		dispatchTouch('touchend', [], [makeTouch(1, 102, 200)]);
		expect(swipes[0].direction).toBe('down');
	});

	test('init options override default thresholds', () => {
		touch.dispose();
		touch = createTouch({ swipeMinDistance: 5 });
		const swipes = [];
		touch.on('swipe', e => swipes.push(e));
		dispatchTouch('touchstart', [makeTouch(1, 100, 100)]);
		dispatchTouch('touchend', [], [makeTouch(1, 108, 100)]);
		expect(swipes.length).toBe(1);
		expect(swipes[0].direction).toBe('right');
	});

	test('three-finger swipe right emits one event with fingerCount 3', async () => {
		const swipes = [];
		touch.on('swipe', e => swipes.push(e));
		dispatchTouch('touchstart', [makeTouch(1, 100, 100), makeTouch(2, 100, 150), makeTouch(3, 100, 200)]);
		await new Promise(r => setTimeout(r, 50));
		dispatchTouch('touchend', [], [makeTouch(1, 200, 100), makeTouch(2, 200, 150), makeTouch(3, 200, 200)]);
		expect(swipes.length).toBe(1);
		expect(swipes[0].direction).toBe('right');
		expect(swipes[0].fingerCount).toBe(3);
	});

	test('staggered touchstarts still count toward peak fingerCount', async () => {
		const swipes = [];
		touch.on('swipe', e => swipes.push(e));
		dispatchTouch('touchstart', [makeTouch(1, 100, 100)]);
		await new Promise(r => setTimeout(r, 10));
		dispatchTouch('touchstart', [makeTouch(1, 100, 100), makeTouch(2, 100, 150)]);
		await new Promise(r => setTimeout(r, 10));
		dispatchTouch('touchstart', [makeTouch(1, 100, 100), makeTouch(2, 100, 150), makeTouch(3, 100, 200)]);
		await new Promise(r => setTimeout(r, 30));
		dispatchTouch('touchend', [], [
			makeTouch(1, 200, 100),
			makeTouch(2, 200, 150),
			makeTouch(3, 200, 200),
		]);
		expect(swipes.length).toBe(1);
		expect(swipes[0].fingerCount).toBe(3);
		expect(swipes[0].direction).toBe('right');
	});

	test('two-finger short non-swipe gesture does not fire swipe', async () => {
		touch.dispose();
		touch = createTouch({ multiTapWindow: 20 });
		const swipes = [];
		const taps = [];
		touch.on('swipe', e => swipes.push(e));
		touch.on('tap', e => taps.push(e));
		dispatchTouch('touchstart', [makeTouch(1, 100, 100), makeTouch(2, 150, 100)]);
		await new Promise(r => setTimeout(r, 30));
		dispatchTouch('touchend', [], [makeTouch(1, 102, 101), makeTouch(2, 151, 101)]);
		await new Promise(r => setTimeout(r, 30));
		expect(swipes.length).toBe(0);
		expect(taps.length).toBe(1);
		expect(taps[0].fingerCount).toBe(2);
		expect(taps[0].tapCount).toBe(1);
	});
});

describe('createTouch: multi-tap', () => {
	let touch;

	beforeEach(() => {
		touch = createTouch({ multiTapWindow: 20 });
	});

	afterEach(() => {
		touch.dispose();
	});

	test('single-finger single tap', async () => {
		const taps = [];
		touch.on('tap', e => taps.push(e));
		dispatchTouch('touchstart', [makeTouch(1, 100, 100)]);
		dispatchTouch('touchend', [], [makeTouch(1, 100, 100)]);
		await new Promise(r => setTimeout(r, 40));
		expect(taps.length).toBe(1);
		expect(taps[0].fingerCount).toBe(1);
		expect(taps[0].tapCount).toBe(1);
	});

	test('single-finger double tap', async () => {
		const taps = [];
		touch.on('tap', e => taps.push(e));
		dispatchTouch('touchstart', [makeTouch(1, 100, 100)]);
		dispatchTouch('touchend', [], [makeTouch(1, 100, 100)]);
		await new Promise(r => setTimeout(r, 5));
		dispatchTouch('touchstart', [makeTouch(2, 102, 101)]);
		dispatchTouch('touchend', [], [makeTouch(2, 102, 101)]);
		await new Promise(r => setTimeout(r, 40));
		expect(taps.length).toBe(1);
		expect(taps[0].fingerCount).toBe(1);
		expect(taps[0].tapCount).toBe(2);
	});

	test('single-finger triple tap', async () => {
		const taps = [];
		touch.on('tap', e => taps.push(e));
		dispatchTouch('touchstart', [makeTouch(1, 100, 100)]);
		dispatchTouch('touchend', [], [makeTouch(1, 100, 100)]);
		await new Promise(r => setTimeout(r, 5));
		dispatchTouch('touchstart', [makeTouch(2, 101, 100)]);
		dispatchTouch('touchend', [], [makeTouch(2, 101, 100)]);
		await new Promise(r => setTimeout(r, 5));
		dispatchTouch('touchstart', [makeTouch(3, 102, 101)]);
		dispatchTouch('touchend', [], [makeTouch(3, 102, 101)]);
		await new Promise(r => setTimeout(r, 40));
		expect(taps.length).toBe(1);
		expect(taps[0].fingerCount).toBe(1);
		expect(taps[0].tapCount).toBe(3);
	});

	test('three-finger single tap emits exactly one event (regression)', async () => {
		const taps = [];
		touch.on('tap', e => taps.push(e));
		dispatchTouch('touchstart', [
			makeTouch(1, 100, 100),
			makeTouch(2, 150, 100),
			makeTouch(3, 200, 100),
		]);
		dispatchTouch('touchend', [], [
			makeTouch(1, 100, 100),
			makeTouch(2, 150, 100),
			makeTouch(3, 200, 100),
		]);
		await new Promise(r => setTimeout(r, 40));
		expect(taps.length).toBe(1);
		expect(taps[0].fingerCount).toBe(3);
		expect(taps[0].tapCount).toBe(1);
	});

	test('three-finger double tap', async () => {
		const taps = [];
		touch.on('tap', e => taps.push(e));
		dispatchTouch('touchstart', [
			makeTouch(1, 100, 100),
			makeTouch(2, 150, 100),
			makeTouch(3, 200, 100),
		]);
		dispatchTouch('touchend', [], [
			makeTouch(1, 100, 100),
			makeTouch(2, 150, 100),
			makeTouch(3, 200, 100),
		]);
		await new Promise(r => setTimeout(r, 5));
		dispatchTouch('touchstart', [
			makeTouch(4, 101, 101),
			makeTouch(5, 151, 101),
			makeTouch(6, 201, 101),
		]);
		dispatchTouch('touchend', [], [
			makeTouch(4, 101, 101),
			makeTouch(5, 151, 101),
			makeTouch(6, 201, 101),
		]);
		await new Promise(r => setTimeout(r, 40));
		expect(taps.length).toBe(1);
		expect(taps[0].fingerCount).toBe(3);
		expect(taps[0].tapCount).toBe(2);
	});

	test('cap at triple tap, then a fresh single', async () => {
		const taps = [];
		touch.on('tap', e => taps.push(e));
		for (let i = 1; i <= 4; i++) {
			dispatchTouch('touchstart', [makeTouch(i, 100, 100)]);
			dispatchTouch('touchend', [], [makeTouch(i, 100, 100)]);
			await new Promise(r => setTimeout(r, 3));
		}
		await new Promise(r => setTimeout(r, 40));
		expect(taps.length).toBe(2);
		expect(taps[0].fingerCount).toBe(1);
		expect(taps[0].tapCount).toBe(3);
		expect(taps[1].fingerCount).toBe(1);
		expect(taps[1].tapCount).toBe(1);
	});

	test('mismatched finger count flushes pending tap', async () => {
		const taps = [];
		touch.on('tap', e => taps.push(e));
		dispatchTouch('touchstart', [makeTouch(1, 100, 100)]);
		dispatchTouch('touchend', [], [makeTouch(1, 100, 100)]);
		await new Promise(r => setTimeout(r, 3));
		dispatchTouch('touchstart', [
			makeTouch(2, 100, 100),
			makeTouch(3, 150, 100),
			makeTouch(4, 200, 100),
		]);
		dispatchTouch('touchend', [], [
			makeTouch(2, 100, 100),
			makeTouch(3, 150, 100),
			makeTouch(4, 200, 100),
		]);
		await new Promise(r => setTimeout(r, 40));
		expect(taps.length).toBe(2);
		expect(taps[0].fingerCount).toBe(1);
		expect(taps[0].tapCount).toBe(1);
		expect(taps[1].fingerCount).toBe(3);
		expect(taps[1].tapCount).toBe(1);
	});

	test('swipe flushes pending tap, tap precedes swipe', async () => {
		const events = [];
		touch.on('tap', e => events.push({ type: 'tap', ...e }));
		touch.on('swipe', e => events.push({ type: 'swipe', ...e }));
		dispatchTouch('touchstart', [makeTouch(1, 100, 100)]);
		dispatchTouch('touchend', [], [makeTouch(1, 100, 100)]);
		await new Promise(r => setTimeout(r, 3));
		dispatchTouch('touchstart', [makeTouch(2, 100, 100)]);
		await new Promise(r => setTimeout(r, 5));
		dispatchTouch('touchend', [], [makeTouch(2, 200, 105)]);
		await new Promise(r => setTimeout(r, 40));
		expect(events.length).toBe(2);
		expect(events[0].type).toBe('tap');
		expect(events[0].tapCount).toBe(1);
		expect(events[1].type).toBe('swipe');
		expect(events[1].direction).toBe('right');
	});

	test('two-finger drag too far emits no tap and no swipe', async () => {
		const taps = [];
		const swipes = [];
		touch.on('tap', e => taps.push(e));
		touch.on('swipe', e => swipes.push(e));
		dispatchTouch('touchstart', [makeTouch(1, 100, 100), makeTouch(2, 150, 100)]);
		await new Promise(r => setTimeout(r, 5));
		dispatchTouch('touchend', [], [makeTouch(1, 115, 100), makeTouch(2, 165, 100)]);
		await new Promise(r => setTimeout(r, 40));
		expect(taps.length).toBe(0);
		expect(swipes.length).toBe(0);
	});
});
