/**
 * Namespaced JSON storage using Web Storage compatible backends.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/storage.md | storage guide}.
 *
 * @module
 */
/** Minimal Web Storage compatible backend used by {@link createStorage}. */
export interface StorageBackend {
	/** Returns the serialized value for a key, or `null` when absent. */
	getItem(key: string): string | null;
	/** Stores a serialized value for a key. */
	setItem(key: string, value: string): void;
	/** Removes a key and its value. */
	removeItem(key: string): void;
}

/** Configuration for {@link createStorage}. */
export interface StorageOptions {
	/** Storage backend. Operations resolve `localStorage` when omitted. */
	backend?: StorageBackend | null;
}

/** Namespaced JSON storage operations. */
export interface StorageInstance {
	/** Reads and parses a value, returning `undefined` when missing or invalid. */
	get<T = unknown>(key: string): T | undefined;
	/** Reads and parses a value, returning `defaultValue` when missing or invalid. */
	get<T>(key: string, defaultValue: T): T;
	/** Serializes and stores a value under a namespaced key. */
	set(key: string, value: any): void;
	/** Removes a namespaced key. */
	remove(key: string): void;
}

/**
 * Creates a namespaced JSON storage wrapper.
 *
 * @throws {Error} When `namespace` is empty or not a string.
 */
export function createStorage(namespace: string, options?: StorageOptions): StorageInstance;
