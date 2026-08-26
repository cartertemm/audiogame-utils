import type { CacophonyEngine, PlaybackHandle, SfxOptions } from './engine.js';

/** A URL, lazy URL function, or lazy bundler module with a default URL export. */
export type SfxSource =
	| string
	| (() => string | Promise<string>)
	| (() => { default: string } | Promise<{ default: string }>);

/** Engine and decoded asset cached by a loaded sound handle. */
export interface LoadedSfx {
	/** Engine that loaded the asset. */
	engine: CacophonyEngine;
	/** Engine specific decoded asset. */
	handle: any;
}

/** Options fixed for the lifetime of an SFX handle. */
export interface SfxCreateOptions {
	/** Panning algorithm chosen when the asset loads. Defaults to `stereo`. */
	panType?: 'stereo' | 'HRTF';
}

/** Playback rate ramp parameters for {@link SfxHandle.rampPitch}. */
export interface RampPitchOptions {
	/** Starting playback rate. */
	from: number;
	/** Ending playback rate. */
	to: number;
	/** Ramp duration in milliseconds. */
	durationMs: number;
}

/** Mutable properties applied to current SFX playback. */
export interface SfxUpdateOptions {
	/** Stereo pan from `-1` through `1`. */
	pan?: number;
	/** Linear playback volume. */
	volume?: number;
}

/** One lazy, reusable sound effect. */
export interface SfxHandle {
	/** Loads and starts playback. Failures are logged instead of thrown. */
	play(options?: SfxOptions): Promise<void>;
	/** Returns whether looping playback remains active. */
	isLooping(): boolean;
	/** Stops current playback and invalidates pending playback. */
	stop(): Promise<void>;
	/** Ramps current playback rate over time. */
	rampPitch(options: RampPitchOptions): void;
	/** Updates current stereo pan or volume. */
	update(options?: SfxUpdateOptions): void;
	/** Loads the sound if needed and assigns a Web Audio position. */
	setPosition(position: [number, number, number]): Promise<void>;
	/** Loads and caches the asset, or returns `null` when audio is unavailable. */
	load(): Promise<LoadedSfx | null>;
}

/** Creates one lazy sound handle using an asynchronous engine provider. */
export function createSfx(getEngine: () => Promise<CacophonyEngine | null>, source: SfxSource, options?: SfxCreateOptions): SfxHandle;

export type { PlaybackHandle, SfxOptions };
