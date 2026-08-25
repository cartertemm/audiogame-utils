import type { SfxHandle, SfxSource } from './sfx.d.ts';
import type { CacophonyEngine } from './engine.d.ts';

export interface AudioOptions {
	// Lets tests inject a fake. Not a public backend API.
	engine?: CacophonyEngine | null;
}

export interface AudioInstance {
	sfx(source: SfxSource): SfxHandle;
	// Fetch and decode handles before playback. Defaults to every handle this
	// instance created.
	preload(list?: SfxHandle[] | null): Promise<void>;
	dispose(): Promise<void>;
}

export function createAudio(options?: AudioOptions): AudioInstance;

export * from './engine.d.ts';
export * from './cacophony.d.ts';
export * from './sfx.d.ts';
export * from './coords.d.ts';
export * from './units.d.ts';
export * from './pool.d.ts';
