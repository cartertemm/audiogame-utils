import type { CacophonyEngine } from './engine.js';
import type { Mixer } from './mixer.js';

/** Configuration for {@link createCacophonyEngine}. */
export interface CacophonyEngineOptions {
	/** Mixer the engine attaches once the audio context exists. Defaults to the shared mixer. */
	mixer?: Mixer;
}

/** Creates a Cacophony adapter that implements the package audio engine contract. */
export function createCacophonyEngine(options?: CacophonyEngineOptions): CacophonyEngine;
