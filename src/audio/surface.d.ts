import type { AudioInstance } from './index.js';
import type { SfxOptions } from './engine.js';
import type { SfxSource } from './sfx.js';
import type { sound_pool, SoundPoolSlot } from './pool.js';

export interface SurfaceManagerOptions {
	// One of the two is required. A pool backed manager only accepts string sources.
	audio?: AudioInstance | null;
	pool?: sound_pool | null;
}

export interface SurfaceStepOptions extends SfxOptions {
	listenerX?: number;
	listenerY?: number;
	listenerZ?: number;
	rotation?: number;
}

export interface SurfaceManager {
	registerSurface(name: string, sources?: SfxSource[] | SfxSource): void;
	addSound(surfaceName: string, source: SfxSource): void;
	getSounds(surfaceName: string): SfxSource[];
	hasSurface(surfaceName: string): boolean;
	// Returns a pool slot when the manager is pool backed, a promise that settles
	// once playback starts when it is audio backed, and null when the surface has
	// no sounds registered.
	playStep(surfaceName: string, x?: number, y?: number, z?: number, options?: SurfaceStepOptions): SoundPoolSlot | Promise<void> | null;
	clear(): void;
}

export function createSurfaceManager(options?: SurfaceManagerOptions): SurfaceManager;
