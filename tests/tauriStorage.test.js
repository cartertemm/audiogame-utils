import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTauriStorageBackend } from '../src/tauri/storage.js';
import { createStorage } from '../src/storage.js';
import { register, resetCapabilities } from '../src/platform.js';
import { control, reset, raw } from './stubs/plugin-store.js';

describe('tauri storage backend', () => {
	beforeEach(() => {
		reset();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	test('reads existing values into memory during setup', async () => {
		reset({ 'game:theme': '"dark"' });
		const backend = await createTauriStorageBackend();
		expect(backend.getItem('game:theme')).toBe('"dark"');
	});

	test('getItem returns null for a missing key', async () => {
		const backend = await createTauriStorageBackend();
		expect(backend.getItem('nope')).toBe(null);
	});

	test('reads after a write are synchronous and do not touch the store', async () => {
		const backend = await createTauriStorageBackend();
		backend.setItem('score', '10');
		expect(backend.getItem('score')).toBe('10');
		expect(raw().has('score')).toBe(false);
	});

	test('writes reach the store after the delay', async () => {
		const backend = await createTauriStorageBackend();
		backend.setItem('score', '10');
		await vi.advanceTimersByTimeAsync(200);
		expect(raw().get('score')).toBe('10');
		expect(control.saves).toBe(1);
	});

	test('several writes inside the delay produce one save', async () => {
		const backend = await createTauriStorageBackend();
		backend.setItem('a', '1');
		backend.setItem('b', '2');
		backend.setItem('c', '3');
		await vi.advanceTimersByTimeAsync(200);
		expect(control.saves).toBe(1);
	});

	test('removeItem deletes from the store', async () => {
		reset({ old: '1' });
		const backend = await createTauriStorageBackend();
		backend.removeItem('old');
		await vi.advanceTimersByTimeAsync(200);
		expect(raw().has('old')).toBe(false);
	});

	test('flush writes immediately and cancels the pending timer', async () => {
		const backend = await createTauriStorageBackend();
		backend.setItem('score', '10');
		await backend.flush();
		expect(raw().get('score')).toBe('10');
		expect(control.saves).toBe(1);

		await vi.advanceTimersByTimeAsync(200);
		expect(control.saves).toBe(1);
	});

	test('flush with nothing pending resolves without saving', async () => {
		const backend = await createTauriStorageBackend();
		await backend.flush();
		expect(control.saves).toBe(0);
	});

	test('a failed write rejects flush, keeps the cache, and retries later', async () => {
		const backend = await createTauriStorageBackend();
		backend.setItem('score', '10');
		control.failOn = 'save';

		await expect(backend.flush()).rejects.toThrow('save failed');
		expect(backend.getItem('score')).toBe('10');

		control.failOn = null;
		await backend.flush();
		expect(raw().get('score')).toBe('10');
	});

	test('a failed background write warns instead of throwing', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const backend = await createTauriStorageBackend();
		control.failOn = 'save';
		backend.setItem('score', '10');
		await vi.advanceTimersByTimeAsync(200);
		expect(warn).toHaveBeenCalled();
	});

	test('honors a custom write delay', async () => {
		const backend = await createTauriStorageBackend({ writeDelayMs: 50 });
		backend.setItem('score', '10');
		await vi.advanceTimersByTimeAsync(50);
		expect(control.saves).toBe(1);
	});
});

describe('createStorage with a registered backend', () => {
	beforeEach(() => {
		reset();
		resetCapabilities();
	});

	afterEach(resetCapabilities);

	test('uses the registered backend when none is passed', async () => {
		register('storage', await createTauriStorageBackend());
		const storage = createStorage('game');
		storage.set('theme', 'dark');
		expect(storage.get('theme')).toBe('dark');
		await storage.flush();
		expect(raw().get('game:theme')).toBe('"dark"');
	});

	test('an explicit backend wins over the registered one', async () => {
		register('storage', await createTauriStorageBackend());
		const calls = [];
		const backend = {
			getItem: () => null,
			setItem: (key, value) => calls.push([key, value]),
			removeItem: () => {},
		};
		createStorage('game', { backend }).set('theme', 'dark');
		expect(calls).toEqual([['game:theme', '"dark"']]);
		expect(raw().size).toBe(0);
	});

	test('flush resolves on a backend that cannot flush', async () => {
		await expect(createStorage('game').flush()).resolves.toBeUndefined();
	});
});
