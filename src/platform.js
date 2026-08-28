// @ts-self-types="./platform.d.ts"
// This module imports nothing so every other module can depend on it.

const capabilities = new Map();
const warned = new Set();

export function isIOS() {
	const ua = navigator.userAgent || '';
	if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return true;
	// iPadOS 13 and later can report a Macintosh user agent with multiple
	// supported touch points.
	if (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1) return true;
	return false;
}

export function isIOSStandalone() {
	return isIOS() && window.navigator.standalone === true;
}

// Tauri injects its internals before any page script runs, which is exact where
// a user agent test is not.
export function runtime() {
	if (typeof globalThis === 'undefined') return 'web';
	return globalThis.__TAURI_INTERNALS__ || globalThis.__TAURI__ ? 'tauri' : 'web';
}

export function os() {
	if (typeof navigator === 'undefined') return 'unknown';
	const ua = navigator.userAgent || '';
	if (/Android/.test(ua)) return 'android';
	if (isIOS()) return 'ios';
	if (/Windows/.test(ua)) return 'windows';
	if (/Mac OS X|Macintosh/.test(ua)) return 'macos';
	if (/Linux|X11|CrOS/.test(ua)) return 'linux';
	return 'unknown';
}

export function isMobile() {
	const name = os();
	return name === 'ios' || name === 'android';
}

export function register(name, impl) {
	capabilities.set(name, impl);
}

// A miss under Tauri almost always means `initRuntime()` was never awaited.
export function capability(name) {
	const impl = capabilities.get(name) ?? null;
	if (!impl && runtime() === 'tauri' && !warned.has(name)) {
		warned.add(name);
		console.warn(
			`audiogame-utils: no "${name}" adapter is registered but this is a Tauri runtime. ` +
			"Await initRuntime() from 'audiogame-utils/runtime' before using the library."
		);
	}
	return impl;
}

// Bundled assets do not need this. Tauri serves the frontend from the origin
// root, so `/sounds/beep.ogg` resolves in a packaged app as it does in a
// browser. This is for files outside the bundle, under a path the operating
// system gave you.
export function fileUrl(path) {
	if (typeof path !== 'string') return path;
	const resolve = capability('file');
	return resolve ? resolve(path) : path;
}

export function resetCapabilities() {
	capabilities.clear();
	warned.clear();
}
