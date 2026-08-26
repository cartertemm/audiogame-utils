import type { AudioInstance } from './index.js';
import type { SfxOptions } from './engine.js';
import type { SfxSource } from './sfx.js';
import type { sound_pool, SoundPoolSlot } from './pool.js';

export type SurfaceManagerOptions =
	| { audio: AudioInstance; pool?: sound_pool | null }
	| { audio?: AudioInstance | null; pool: sound_pool };

export interface SurfaceStepOptions extends SfxOptions {
	listenerX?: number;
	listenerY?: number;
	listenerZ?: number;
	rotation?: number;
}

export interface SurfaceManager<TSource extends SfxSource = SfxSource> {
	registerSurface(name: string, sources?: TSource[] | TSource): void;
	addSound(surfaceName: string, source: TSource): void;
	getSounds(surfaceName: string): TSource[];
	hasSurface(surfaceName: string): boolean;
	playStep(surfaceName: string, x?: number, y?: number, z?: number, options?: SurfaceStepOptions): SoundPoolSlot | Promise<void> | null;
	clear(): void;
}

export function createSurfaceManager(options: { audio?: AudioInstance | null; pool: sound_pool }): SurfaceManager<string>;
export function createSurfaceManager(options: { audio: AudioInstance; pool?: null }): SurfaceManager<SfxSource>;
export function createSurfaceManager(options: SurfaceManagerOptions): SurfaceManager;
