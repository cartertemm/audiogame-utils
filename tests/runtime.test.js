import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// `initRuntime` caches its promise for the life of the module, so each test
// loads a fresh copy of it and of the platform module it registers into.
async function fresh() {
	vi.resetModules();
	const [runtime, platform] = await Promise.all([
		import('../src/runtime.js'),
		import('../src/platform.js'),
	]);
	return { initRuntime: runtime.initRuntime, platform };
}

describe('initRuntime', () => {
	beforeEach(() => {
		delete globalThis.__TAURI_INTERNALS__;
	});

	afterEach(() => {
		delete globalThis.__TAURI_INTERNALS__;
		vi.restoreAllMocks();
	});

	test('resolves web and registers nothing outside Tauri', async () => {
		const { initRuntime, platform } = await fresh();
		await expect(initRuntime()).resolves.toBe('web');
		expect(platform.capability('storage')).toBe(null);
	});

	test('registers storage, window, and file adapters under Tauri', async () => {
		globalThis.__TAURI_INTERNALS__ = {};
		const { initRuntime, platform } = await fresh();
		await expect(initRuntime()).resolves.toBe('tauri');
		expect(platform.capability('storage')).not.toBe(null);
		expect(platform.capability('window')).not.toBe(null);
		expect(platform.capability('file')('/tmp/pack.ogg')).toContain('asset://');
	});

	test('repeated calls return the promise from the first call', async () => {
		const { initRuntime } = await fresh();
		expect(initRuntime()).toBe(initRuntime());
	});

	test('a failed adapter load names the install command and allows a retry', async () => {
		globalThis.__TAURI_INTERNALS__ = {};
		vi.resetModules();
		vi.doMock('../src/tauri/index.js', () => {
			throw new Error('Cannot find package');
		});

		const { initRuntime } = await import('../src/runtime.js');
		await expect(initRuntime()).rejects.toThrow('@tauri-apps/api @tauri-apps/plugin-store');

		vi.doUnmock('../src/tauri/index.js');
		vi.resetModules();
	});
});
