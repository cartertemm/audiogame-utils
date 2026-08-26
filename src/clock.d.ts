/**
 * Fixed rate game loop timing and countdown timers.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/clock.md | clock guide}.
 *
 * @module
 */
/** Configuration for {@link createClock}. */
export interface ClockOptions {
	/** Target updates per second. Defaults to `60`. */
	fps?: number;
	/** Handler called after each update with delta and elapsed seconds. */
	onTick?: (dt: number, elapsed: number) => void;
	/** Starts the clock immediately. Defaults to `false`. */
	autoStart?: boolean;
}

/** A fixed rate game clock that reports elapsed time in seconds. */
export interface Clock {
	/** Whether the clock is scheduling animation frames. */
	readonly running: boolean;
	/** Target updates per second. */
	fps: number;
	/** Delta time in seconds from the latest tick. */
	readonly dt: number;
	/** Total elapsed time in seconds since the latest reset. */
	readonly elapsed: number;
	/** Number of ticks since the latest reset. */
	readonly tickCount: number;
	/** Registers a handler called after each update. */
	on(handler: (dt: number, elapsed: number) => void): void;
	/** Removes a previously registered update handler. */
	off(handler: (dt: number, elapsed: number) => void): void;
	/** Begins scheduling updates when the clock is stopped. */
	start(): void;
	/** Stops scheduled updates without resetting elapsed state. */
	stop(): void;
	/** Stops the clock and clears its elapsed state. */
	reset(): void;
	/** Advances the clock once, optionally using a manual delta in seconds. */
	tick(manualDt?: number | null): void;
}

/** Configuration for {@link createTimer}. */
export interface TimerOptions {
	/** Timer duration in seconds. Defaults to `1`. */
	duration?: number;
	/** Handler called on updates with remaining and total seconds. */
	onTick?: (remaining: number, duration: number) => void;
	/** Handler called once when the timer reaches zero. */
	onComplete?: () => void;
	/** Starts the timer immediately. Defaults to `false`. */
	autoStart?: boolean;
}

/** A countdown timer advanced with explicit delta time updates. */
export interface Timer {
	/** Whether the timer accepts updates. */
	readonly running: boolean;
	/** Configured duration in seconds. */
	readonly duration: number;
	/** Seconds remaining before completion. */
	readonly remaining: number;
	/** Completion ratio from `0` through `1`. */
	readonly progress: number;
	/** Starts or resumes the timer. */
	start(): void;
	/** Pauses the timer without changing its remaining time. */
	pause(): void;
	/** Pauses the timer and restores its full duration. */
	reset(): void;
	/** Subtracts a delta in seconds while the timer is running. */
	update(dt: number): void;
}

/** Creates a fixed rate game clock. */
export function createClock(options?: ClockOptions): Clock;
/** Creates a countdown timer driven by explicit updates. */
export function createTimer(options?: TimerOptions): Timer;
