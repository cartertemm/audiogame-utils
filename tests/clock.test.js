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
});

describe('createTimer', () => {
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
