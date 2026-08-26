import type { SfxHandle, SfxSource, SfxCreateOptions } from './sfx.js';
import type { CacophonyEngine } from './engine.js';

export interface AudioOptions {
	engine?: CacophonyEngine | null;
}

export interface AudioInstance {
	sfx(source: SfxSource, options?: SfxCreateOptions): SfxHandle;
	// Fetch and decode handles before playback. Defaults to every handle this
	// instance created.
	preload(list?: SfxHandle[] | null): Promise<void>;
	dispose(): Promise<void>;
}

export function createAudio(options?: AudioOptions): AudioInstance;

export * from './engine.js';
export * from './cacophony.js';
export * from './sfx.js';
export * from './coords.js';
export * from './units.js';
export * from './pool.js';
export * from './surface.js';
