import type { CacophonyEngine, PlaybackHandle, SfxOptions } from './engine.d.ts';

// A URL string, or a function returning one, or a function returning a module
// object with a `default` URL (the shape a bundler gives `import('./x.ogg?url')`).
export type SfxSource =
	| string
	| (() => string | Promise<string>)
	| (() => { default: string } | Promise<{ default: string }>);

export interface LoadedSfx {
	engine: CacophonyEngine;
	handle: any;
}

export interface RampPitchOptions {
	from: number;
	to: number;
	durationMs: number;
}

export interface SfxUpdateOptions {
	pan?: number;
	volume?: number;
}

export interface SfxHandle {
	// Resolves once playback has started. Failures are logged, not thrown, so
	// this never resolves to the playback itself.
	play(options?: SfxOptions): Promise<void>;
	isLooping(): boolean;
	stop(): Promise<void>;
	// Slides `playbackRate` from `from` to `to`, which moves pitch and speed together.
	rampPitch(options: RampPitchOptions): void;
	// Adjusts a playback already running, such as one tracking a moving object.
	update(options?: SfxUpdateOptions): void;
	setPosition(position: [number, number, number]): Promise<void>;
	// Null when the page has no audio engine.
	load(): Promise<LoadedSfx | null>;
}

export function createSfx(getEngine: () => Promise<CacophonyEngine | null>, source: SfxSource): SfxHandle;

export type { PlaybackHandle, SfxOptions };
