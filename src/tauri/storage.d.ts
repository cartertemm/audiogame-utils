/**
 * Tauri storage backend for {@link createStorage}.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/tauri.md | Tauri guide}.
 *
 * @module
 */
import type { StorageBackend } from '../storage.js';

/** Configuration for {@link createTauriStorageBackend}. */
export interface TauriStorageOptions {
	/** Store file name. Defaults to `audiogame-utils.json`. */
	file?: string;
	/** Milliseconds to wait before writing changed values to disk. Defaults to `200`. */
	writeDelayMs?: number;
}

/** A storage backend that caches reads in memory and writes to disk on a delay. */
export interface TauriStorageBackend extends StorageBackend {
	/** Writes pending changes immediately. Rejects when the write fails, leaving the cache intact. */
	flush(): Promise<void>;
}

/**
 * Creates a Tauri storage backend, reading the store into memory before it
 * resolves so later reads are synchronous.
 */
export function createTauriStorageBackend(options?: TauriStorageOptions): Promise<TauriStorageBackend>;
