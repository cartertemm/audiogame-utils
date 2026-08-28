// @ts-self-types="./storage.d.ts"
// Disk writes are asynchronous and `storage.get()` is not, so the whole store is
// read into memory during setup and reads come from there.
//
// The write delay leaves a window where a crash loses the most recent change.
// `flush()` closes it at the points that matter: a save point, a settings
// change, a close request.

import { load } from '@tauri-apps/plugin-store';

const DEFAULT_FILE = 'audiogame-utils.json';
const DEFAULT_WRITE_DELAY_MS = 200;

export async function createTauriStorageBackend({
	file = DEFAULT_FILE,
	writeDelayMs = DEFAULT_WRITE_DELAY_MS,
} = {}) {
	const store = await load(file, { autoSave: false });
	const cache = new Map();
	for (const [key, value] of await store.entries()) {
		if (typeof value === 'string') cache.set(key, value);
	}

	const dirty = new Set();
	let timer = null;

	async function write() {
		const keys = [...dirty];
		dirty.clear();
		try {
			for (const key of keys) {
				if (cache.has(key)) await store.set(key, cache.get(key));
				else await store.delete(key);
			}
			await store.save();
		} catch (err) {
			for (const key of keys) dirty.add(key);
			throw err;
		}
	}

	function schedule() {
		if (timer) return;
		timer = setTimeout(() => {
			timer = null;
			write().catch(err => console.warn('audiogame-utils: storage write failed', err));
		}, writeDelayMs);
	}

	return {
		getItem(key) {
			return cache.has(key) ? cache.get(key) : null;
		},

		setItem(key, value) {
			cache.set(key, String(value));
			dirty.add(key);
			schedule();
		},

		removeItem(key) {
			cache.delete(key);
			dirty.add(key);
			schedule();
		},

		flush() {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
			if (dirty.size === 0) return Promise.resolve();
			return write();
		},
	};
}
