/**
 * Native adapters for Tauri.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/tauri.md | Tauri guide}.
 *
 * @module
 */
import type { TauriStorageBackend } from './storage.js';

export { createTauriStorageBackend } from './storage.js';
export { createTauriWindow } from './window.js';
export type { TauriStorageBackend, TauriStorageOptions } from './storage.js';

/** Options for {@link setup}. */
export interface SetupOptions {
	/** Store file name used for native storage. Defaults to `audiogame-utils.json`. */
	storeFile?: string;
	/** Milliseconds to wait before writing changed values to disk. Defaults to `200`. */
	writeDelayMs?: number;
}

/** Builds the native adapters and registers them with the platform module. */
export function setup(options?: SetupOptions): Promise<{ storage: TauriStorageBackend }>;
