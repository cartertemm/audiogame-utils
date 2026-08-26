/** Playback properties accepted by an audio engine. */
export interface SfxOptions {
	/** Linear playback volume. */
	volume?: number;
	/** Stereo pan from `-1` through `1`. */
	pan?: number;
	/** Playback rate multiplier. */
	rate?: number;
	/** Starting offset in seconds. */
	offset?: number;
	/** Repeats playback until stopped. */
	loop?: boolean;
	/** Stereo or spatial panning algorithm. */
	panType?: 'stereo' | 'HRTF';
	/** Custom audio graph destination. */
	destination?: any;
	/** Web Audio source position. */
	position?: [number, number, number];
	/** Engine specific spatial audio options. */
	threeDOptions?: any;
}

/** Mutable engine playback returned for one sound voice. */
export interface PlaybackHandle {
	/** Whether the voice is currently playing when exposed by the engine. */
	readonly isPlaying?: boolean;
	/** Panning algorithm selected for the voice. */
	readonly panType?: 'stereo' | 'HRTF';
	/** Linear playback volume. */
	volume?: number;
	/** Playback rate multiplier. */
	playbackRate?: number;
	/** Stereo pan from `-1` through `1`. */
	stereoPan?: number;
	/** Web Audio source position. */
	position?: [number, number, number];
	/** Engine specific spatial audio options. */
	threeDOptions?: any;
	/** Stops the voice. */
	stop(): void;
	/** Pauses the voice when supported by the engine. */
	pause?(): void;
	/** Seeks to a playback offset when supported by the engine. */
	seek?(seconds: number): void;
}

/** Options fixed when an engine loads an asset. */
export interface EngineLoadOptions {
	/** Panning algorithm prepared for the asset. */
	panType?: 'stereo' | 'HRTF';
	/** Engine specific sound type. */
	soundType?: any;
}

/** Position and orientation updates for the audio listener. */
export interface ListenerOptions {
	/** Web Audio listener position. */
	position?: [number, number, number];
	/** Web Audio forward and up vectors. */
	orientation?: { forward: number[]; up: number[] };
}

/** Audio engine contract used by higher level package helpers. */
export interface CacophonyEngine {
	/** Loads and decodes an audio asset. */
	load(url: string, options?: EngineLoadOptions): Promise<any>;
	/** Allocates a playback voice without starting it. */
	spawn(handle: any, options?: SfxOptions): PlaybackHandle | null;
	/** Starts a previously allocated playback voice. */
	start(inst: PlaybackHandle | null, options?: SfxOptions): PlaybackHandle | null;
	/** Allocates and starts a playback voice. */
	play(handle: any, options?: SfxOptions): PlaybackHandle | null;
	/** Stops a playback voice. */
	stop(inst: any): void;
	/** Sets the Web Audio position associated with a loaded handle. */
	setPosition(handle: any, position: [number, number, number]): void;
	/** Updates listener position or orientation and reports support. */
	setListener(options?: ListenerOptions): boolean;
	/** Resolves when the engine can begin loading or playing audio. */
	ready(): Promise<any>;
}

/** Returns whether the page exposes an AudioContext implementation. */
export function audio_available(): boolean;
/** Returns the shared engine, or `null` when the page has no AudioContext. */
export function get_shared_engine(): CacophonyEngine | null;
