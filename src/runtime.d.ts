/**
 * Runtime bootstrap. Detects Tauri and loads its native adapters.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/tauri.md | Tauri guide}.
 *
 * @module
 */
import type { Runtime } from './platform.js';

/** Options for {@link initRuntime}. */
export interface RuntimeOptions {
	/** Store file name used for native storage. Defaults to `audiogame-utils.json`. */
	storeFile?: string;
	/** Milliseconds to wait before writing changed values to disk. Defaults to `200`. */
	writeDelayMs?: number;
}

/**
 * Loads and registers the native adapters for the current runtime.
 *
 * Resolves immediately on the web. Under Tauri it loads the adapters and reads
 * stored values into memory before resolving, so synchronous storage reads work
 * afterwards. Repeated calls return the promise from the first call.
 *
 * @throws {Error} Under Tauri when the adapters or their peer dependencies cannot load.
 */
export function initRuntime(options?: RuntimeOptions): Promise<Runtime>;
