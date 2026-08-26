export interface SfxOptions {
	volume?: number;
	pan?: number;
	rate?: number;
	offset?: number;
	loop?: boolean;
	panType?: 'stereo' | 'HRTF';
	destination?: any;
	position?: [number, number, number];
	threeDOptions?: any;
}

// A single running playback, as returned by the engine. This mirrors the
// Cacophony `Playback` surface the rest of the library touches.
export interface PlaybackHandle {
	readonly isPlaying?: boolean;
	readonly panType?: 'stereo' | 'HRTF';
	volume?: number;
	playbackRate?: number;
	stereoPan?: number;
	position?: [number, number, number];
	threeDOptions?: any;
	stop(): void;
	pause?(): void;
	seek?(seconds: number): void;
}

export interface EngineLoadOptions {
	panType?: 'stereo' | 'HRTF';
	soundType?: any;
}

export interface ListenerOptions {
	position?: [number, number, number];
	orientation?: { forward: number[]; up: number[] };
}

export interface CacophonyEngine {
	load(url: string, options?: EngineLoadOptions): Promise<any>;
	spawn(handle: any, options?: SfxOptions): PlaybackHandle | null;
	start(inst: PlaybackHandle | null, options?: SfxOptions): PlaybackHandle | null;
	play(handle: any, options?: SfxOptions): PlaybackHandle | null;
	stop(inst: any): void;
	setPosition(handle: any, position: [number, number, number]): void;
	setListener(options?: ListenerOptions): boolean;
	ready(): Promise<any>;
}

export function audio_available(): boolean;
// Null when the page has no `AudioContext`.
export function get_shared_engine(): CacophonyEngine | null;
