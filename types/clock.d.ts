export interface ClockOptions {
	fps?: number;
	onTick?: (dt: number, elapsed: number) => void;
	autoStart?: boolean;
}

export interface Clock {
	readonly running: boolean;
	fps: number;
	readonly dt: number;
	readonly elapsed: number;
	readonly tickCount: number;
	on(handler: (dt: number, elapsed: number) => void): void;
	off(handler: (dt: number, elapsed: number) => void): void;
	start(): void;
	stop(): void;
	reset(): void;
	tick(manualDt?: number | null): void;
}

export interface TimerOptions {
	duration?: number;
	onTick?: (remaining: number, duration: number) => void;
	onComplete?: () => void;
	autoStart?: boolean;
}

export interface Timer {
	readonly running: boolean;
	readonly duration: number;
	readonly remaining: number;
	readonly progress: number;
	start(): void;
	pause(): void;
	reset(): void;
	update(dt: number): void;
}

export function createClock(options?: ClockOptions): Clock;
export function createTimer(options?: TimerOptions): Timer;
