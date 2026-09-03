/**
 * Lazy sound loading, spatial playback, sound pools, and surface effects.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/audio.md | audio guide}.
 *
 * @module
 */
import type { SfxHandle, SfxSource, SfxCreateOptions } from './sfx.js';
import type { CacophonyEngine } from './engine.js';
import type { Mixer } from './mixer.js';

/** Configuration for {@link createAudio}. */
export interface AudioOptions {
	/** Engine used by created sound handles. Defaults to a lazy shared Cacophony engine. */
	engine?: CacophonyEngine | null;
}

/** Lazy sound handles that share one audio engine. */
export interface AudioInstance {
	/** Named volume channels, usable before any audio loads. */
	readonly mixer: Mixer;
	/** Creates and registers a lazy sound handle. */
	sfx(source: SfxSource, options?: SfxCreateOptions): SfxHandle;
	/** Loads selected handles, or every handle created by this instance when omitted. */
	preload(list?: SfxHandle[] | null): Promise<void>;
	/** Stops all registered sounds and forgets their handles. */
	dispose(): Promise<void>;
}

/** Creates a collection of lazy sound handles backed by one engine. */
export function createAudio(options?: AudioOptions): AudioInstance;

export * from './engine.js';
export * from './mixer.js';
export * from './cacophony.js';
export * from './sfx.js';
export * from './coords.js';
export * from './units.js';
export * from './pool.js';
export * from './surface.js';
