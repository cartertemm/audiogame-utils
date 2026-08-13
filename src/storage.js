// Stores namespaced values as JSON. Passing a storage instance to each stateful
// module lets the caller choose where preferences are stored and simplifies
// testing.

// `backend` can be any object that implements the Storage interface methods
// `getItem`, `setItem`, and `removeItem`. Each operation resolves the backend so
// tests can replace `globalThis.localStorage` after calling `createStorage()`.
export function createStorage(namespace, { backend = null } = {}) {
	if (typeof namespace !== 'string' || namespace.length === 0) {
		throw new Error('createStorage requires a namespace string');
	}
	const prefix = `${namespace}:`;
	const store = () => backend ?? localStorage;
	return {
		get(key, defaultValue = undefined) {
			const raw = store().getItem(prefix + key);
			if (raw === null) return defaultValue;
			try {
				return JSON.parse(raw);
			} catch {
				return defaultValue;
			}
		},

		set(key, value) {
			store().setItem(prefix + key, JSON.stringify(value));
		},

		remove(key) {
			store().removeItem(prefix + key);
		},
	};
}
