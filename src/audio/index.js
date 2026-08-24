import { createSfx } from './sfx.js';
import { get_shared_engine } from './engine.js';

// Creates audio handles that share one audio engine.
//
// Delay engine construction until a sound loads so this module can run in test
// and server rendering environments that do not provide `AudioContext`. Audio
// handle operations have no effect when `AudioContext` is unavailable.
//
// The `engine` option lets tests inject a fake. It is not a public backend API.
export function createAudio({ engine = null } = {}) {
	let resolved = engine;
	let checked = engine !== null;
	const handles = new Set();

	async function getEngine() {
		if (checked) return resolved;
		checked = true;
		resolved = get_shared_engine();
		return resolved;
	}

	return {
		sfx(source) {
			const handle = createSfx(getEngine, source);
			handles.add(handle);
			return handle;
		},

		// Fetch and decode handles before playback. The default list contains
		// every handle created by this instance.
		async preload(list = null) {
			const targets = list ?? Array.from(handles);
			await Promise.all(targets.map(h => h.load()));
		},

		async dispose() {
			await Promise.all(Array.from(handles).map(h => h.stop()));
			handles.clear();
		},
	};
}

export { createSfx } from './sfx.js';
export { createCacophonyEngine } from './cacophony.js';
export { get_shared_engine, audio_available } from './engine.js';
export { sound_pool, sound_pool_item, create_sound_pool, sound_pool_default_y_elevation, set_sound_pool_default_y_elevation } from './pool.js';
export { createSurfaceManager } from './surface.js';
export * from './coords.js';
export * from './units.js';
