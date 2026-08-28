/**
 * Native window and application control for Tauri.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/tauri.md | Tauri guide}.
 *
 * @module
 */
import type { WindowControl } from '../window.js';

/** Creates the native window controller for the current Tauri window. */
export function createTauriWindow(): WindowControl;
