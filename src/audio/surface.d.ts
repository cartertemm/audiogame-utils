import type { AudioInstance } from './index.js';
import type { SfxOptions } from './engine.js';
import type { SfxSource } from './sfx.js';
import type { sound_pool, SoundPoolSlot } from './pool.js';

/** An audio instance or sound pool used for surface step playback. */
export type SurfaceManagerOptions =
	| { audio: AudioInstance; pool?: sound_pool | null }
	| { audio?: AudioInstance | null; pool: sound_pool };

/** Sound options and listener state used for one surface step. */
export interface SurfaceStepOptions extends SfxOptions {
	/** Listener X coordinate. */
	listenerX?: number;
	/** Listener Y coordinate. */
	listenerY?: number;
	/** Listener Z coordinate. */
	listenerZ?: number;
	/** Clockwise listener rotation in degrees. */
	rotation?: number;
}

/** Named banks of footstep sounds played through one audio backend. */
export interface SurfaceManager<TSource extends SfxSource = SfxSource> {
	/** Creates or replaces a named bank with copied sources. */
	registerSurface(name: string, sources?: TSource[] | TSource): void;
	/** Adds one source, creating the named bank when needed. */
	addSound(surfaceName: string, source: TSource): void;
	/** Returns a copy of sources registered for a bank. */
	getSounds(surfaceName: string): TSource[];
	/** Returns whether a bank exists and contains at least one source. */
	hasSurface(surfaceName: string): boolean;
	/** Plays a random source at game coordinates, or returns `null` for an empty bank. */
	playStep(surfaceName: string, x?: number, y?: number, z?: number, options?: SurfaceStepOptions): SoundPoolSlot | Promise<void> | null;
	/** Removes banks and cached handles, stopping cached SFX playback. */
	clear(): void;
}

/** Creates a surface manager backed by a legacy sound pool. */
export function createSurfaceManager(options: { audio?: AudioInstance | null; pool: sound_pool }): SurfaceManager<string>;
/** Creates a surface manager backed by lazy audio handles. */
export function createSurfaceManager(options: { audio: AudioInstance; pool?: null }): SurfaceManager<SfxSource>;
/** Creates a surface manager from an audio instance or legacy sound pool. */
export function createSurfaceManager(options: SurfaceManagerOptions): SurfaceManager;
