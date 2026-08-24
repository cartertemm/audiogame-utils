export interface StorageBackend {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
}

export interface StorageOptions {
	backend?: StorageBackend | null;
}

export interface StorageInstance {
	get<T = any>(key: string, defaultValue?: T): T;
	set(key: string, value: any): void;
	remove(key: string): void;
}

export function createStorage(namespace: string, options?: StorageOptions): StorageInstance;
