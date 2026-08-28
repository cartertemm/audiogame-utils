// Stands in for `@tauri-apps/plugin-store` under test.

const data = new Map();
export const control = { saves: 0, failOn: null };

export function reset(initial = {}) {
	data.clear();
	for (const [key, value] of Object.entries(initial)) data.set(key, value);
	control.saves = 0;
	control.failOn = null;
}

export function raw() {
	return data;
}

export async function load() {
	return {
		async entries() {
			return [...data.entries()];
		},
		async set(key, value) {
			if (control.failOn === 'set') throw new Error('set failed');
			data.set(key, value);
		},
		async delete(key) {
			data.delete(key);
		},
		async save() {
			if (control.failOn === 'save') throw new Error('save failed');
			control.saves++;
		},
	};
}
