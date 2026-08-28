/**
 * Runtime detection, the native capability registry, and asset path resolution.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/platform.md | platform guide}.
 *
 * @module
 */
/** Runtime a game is running in. */
export type Runtime = 'web' | 'tauri';

/** Operating system a game is running on. */
export type OS = 'windows' | 'macos' | 'linux' | 'ios' | 'android' | 'unknown';

/** Returns whether the current browser identifies as iOS or iPadOS. */
export function isIOS(): boolean;
/** Returns whether the page runs as an installed standalone app on iOS or iPadOS. */
export function isIOSStandalone(): boolean;
/** Returns the runtime hosting the page, detected from Tauri's injected globals. */
export function runtime(): Runtime;
/** Returns the operating system, or `'unknown'` when it cannot be determined. */
export function os(): OS;
/** Returns whether the operating system is iOS or Android. */
export function isMobile(): boolean;
/** Registers a native capability implementation. Called by adapters, not by games. */
export function register(name: string, impl: unknown): void;
/**
 * Returns the registered implementation for a capability, or `null`.
 *
 * Warns once per name when nothing is registered under the Tauri runtime, which
 * means `initRuntime()` was never awaited.
 */
export function capability<T = unknown>(name: string): T | null;
/**
 * Converts an operating system file path into a URL the webview can load.
 *
 * Bundled assets do not need this. Tauri serves the frontend from the origin
 * root, so a root relative path such as `/sounds/beep.ogg` already resolves.
 * Use this for files outside the bundle. Returns the path unchanged on the web.
 */
export function fileUrl(path: string): string;
/** Clears every registered capability. A testing seam. */
export function resetCapabilities(): void;
