import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	runtime,
	os,
	isMobile,
	register,
	capability,
	fileUrl,
	resetCapabilities,
} from '../src/platform.js';

function setUA(value) {
	Object.defineProperty(window.navigator, 'userAgent', { value, configurable: true });
}

function enterTauri() {
	globalThis.__TAURI_INTERNALS__ = {};
}

function leaveTauri() {
	delete globalThis.__TAURI_INTERNALS__;
}

describe('platform: runtime', () => {
	afterEach(leaveTauri);

	test('reports web with no Tauri globals', () => {
		expect(runtime()).toBe('web');
	});

	test('reports tauri when the internals global is present', () => {
		enterTauri();
		expect(runtime()).toBe('tauri');
	});

	test('reports tauri for the legacy global', () => {
		globalThis.__TAURI__ = {};
		expect(runtime()).toBe('tauri');
		delete globalThis.__TAURI__;
	});
});

describe('platform: os', () => {
	afterEach(() => setUA(''));

	test.each([
		['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'windows'],
		['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'macos'],
		['Mozilla/5.0 (X11; Linux x86_64)', 'linux'],
		['Mozilla/5.0 (Linux; Android 14; Pixel 8)', 'android'],
		['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'ios'],
	])('%s is %s', (ua, expected) => {
		setUA(ua);
		expect(os()).toBe(expected);
	});

	test('returns unknown for an unrecognized agent', () => {
		setUA('SomeBot/1.0');
		expect(os()).toBe('unknown');
	});

	test('isMobile is true only for iOS and Android', () => {
		setUA('Mozilla/5.0 (Linux; Android 14; Pixel 8)');
		expect(isMobile()).toBe(true);
		setUA('Mozilla/5.0 (X11; Linux x86_64)');
		expect(isMobile()).toBe(false);
	});
});

describe('platform: capability registry', () => {
	beforeEach(resetCapabilities);
	afterEach(() => {
		resetCapabilities();
		leaveTauri();
		vi.restoreAllMocks();
	});

	test('returns what was registered', () => {
		const impl = { hello: true };
		register('storage', impl);
		expect(capability('storage')).toBe(impl);
	});

	test('returns null and stays quiet on the web', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(capability('storage')).toBe(null);
		expect(warn).not.toHaveBeenCalled();
	});

	test('warns once per name when missing under Tauri', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		enterTauri();
		capability('storage');
		capability('storage');
		capability('window');
		expect(warn).toHaveBeenCalledTimes(2);
		expect(warn.mock.calls[0][0]).toContain('initRuntime()');
	});
});

describe('platform: fileUrl', () => {
	beforeEach(resetCapabilities);
	afterEach(resetCapabilities);

	test('returns the path unchanged with no resolver', () => {
		expect(fileUrl('/home/player/pack/step.ogg')).toBe('/home/player/pack/step.ogg');
	});

	test('uses the registered resolver', () => {
		register('file', path => `asset://${path}`);
		expect(fileUrl('C:\\games\\step.ogg')).toBe('asset://C:\\games\\step.ogg');
	});

	test('passes non-strings through', () => {
		expect(fileUrl(undefined)).toBe(undefined);
	});
});
