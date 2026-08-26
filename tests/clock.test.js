import { describe, test, expect, vi } from 'vitest';
import { createClock, createTimer } from '../src/clock.js';

describe('createClock', () => {
	test('defaults to 60 FPS target rate', () => {
		const clock = createClock();
		expect(clock.fps).toBe(60);
		expect(clock.running).toBe(false);
		expect(clock.tickCount).toBe(0);
	});

	test('tick advances elapsed time and fires listeners', () => {
		const ticks = [];
		const clock = createClock({
			fps: 60,
			onTick: (dt, elapsed) => ticks.push({ dt, elapsed }),
		});

		clock.tick(1 / 60);
		expect(clock.tickCount).toBe(1);
		expect(clock.elapsed).toBeCloseTo(1 / 60);
		expect(ticks).toHaveLength(1);

		clock.tick(1 / 60);
		expect(clock.tickCount).toBe(2);
		expect(clock.elapsed).toBeCloseTo(2 / 60);
		expect(ticks).toHaveLength(2);
	});

	test('reset resets elapsed time and tick count', () => {
		const clock = createClock({ fps: 60 });
		clock.tick(0.1);
		clock.tick(0.1);
		expect(clock.tickCount).toBe(2);

		clock.reset();
		expect(clock.tickCount).toBe(0);
		expect(clock.elapsed).toBe(0);
		expect(clock.running).toBe(false);
	});

	test('enforces the target FPS when using animation frames', () => {
		let now = 1000;
		const callbacks = [];
		vi.stubGlobal('performance', { now: () => now });
		vi.stubGlobal('requestAnimationFrame', (callback) => {
			callbacks.push(callback);
			return callbacks.length;
		});
		vi.stubGlobal('cancelAnimationFrame', () => {});
		const clock = createClock({ fps: 50 });

		try {
			clock.start();
			for (let frame = 0; frame < 60; frame++) {
				now += 1000 / 60;
				callbacks.shift()();
			}

			expect(clock.tickCount).toBe(50);
		} finally {
			clock.stop();
			vi.unstubAllGlobals();
		}
	});

	test.each([75, 90, 120, 144, 165])('enforces 60 FPS at %i Hz', (refreshRate) => {
		let now = 1000;
		const callbacks = [];
		vi.stubGlobal('performance', { now: () => now });
		vi.stubGlobal('requestAnimationFrame', (callback) => {
			callbacks.push(callback);
			return callbacks.length;
		});
		vi.stubGlobal('cancelAnimationFrame', () => {});
		const clock = createClock({ fps: 60 });

		try {
			clock.start();
			for (let frame = 0; frame < refreshRate; frame++) {
				now += 1000 / refreshRate;
				callbacks.shift()();
			}

			expect(clock.tickCount).toBe(60);
		} finally {
			clock.stop();
			vi.unstubAllGlobals();
		}
	});
});

describe('createTimer', () => {
	test('completes a zero duration timer immediately', () => {
		const onComplete = vi.fn();
		const timer = createTimer({ duration: 0, onComplete, autoStart: true });

		expect(timer.running).toBe(false);
		expect(timer.remaining).toBe(0);
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	test('tracks remaining time and progress', () => {
		const onComplete = vi.fn();
		const timer = createTimer({ duration: 2, onComplete, autoStart: true });

		expect(timer.running).toBe(true);
		expect(timer.remaining).toBe(2);
		expect(timer.progress).toBe(0);

		timer.update(1);
		expect(timer.remaining).toBe(1);
		expect(timer.progress).toBe(0.5);

		timer.update(1);
		expect(timer.remaining).toBe(0);
		expect(timer.progress).toBe(1);
		expect(timer.running).toBe(false);
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	test('pause and reset timer', () => {
		const timer = createTimer({ duration: 5, autoStart: true });
		timer.update(2);
		expect(timer.remaining).toBe(3);

		timer.pause();
		expect(timer.running).toBe(false);
		timer.update(1);
		expect(timer.remaining).toBe(3);

		timer.reset();
		expect(timer.remaining).toBe(5);
		expect(timer.progress).toBe(0);
	});
});
