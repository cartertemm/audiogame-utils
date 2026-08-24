// Manages surface footstep sound banks and spatial step sound playback.

import { random_choice } from '../math.js';

export function createSurfaceManager({ audio = null, pool = null } = {}) {
	if (!audio && !pool) {
		throw new Error('createSurfaceManager requires an audio instance or sound_pool');
	}
	const surfaces = new Map();
	const handles = new Map();

	function getHandle(source) {
		if (typeof source !== 'string') return source;
		if (!handles.has(source) && audio) {
			handles.set(source, audio.sfx(source));
		}
		return handles.get(source) ?? source;
	}

	function registerSurface(name, sources = []) {
		if (typeof name !== 'string' || name.length === 0) {
			throw new Error('registerSurface requires a valid surface name');
		}
		const list = Array.isArray(sources) ? [...sources] : [sources];
		surfaces.set(name, list);
	}

	function addSound(surfaceName, source) {
		if (!surfaces.has(surfaceName)) {
			surfaces.set(surfaceName, []);
		}
		surfaces.get(surfaceName).push(source);
	}

	function getSounds(surfaceName) {
		return surfaces.get(surfaceName) ? [...surfaces.get(surfaceName)] : [];
	}

	function hasSurface(surfaceName) {
		return surfaces.has(surfaceName) && surfaces.get(surfaceName).length > 0;
	}

	function playStep(surfaceName, x = 0, y = 0, z = 0, options = {}) {
		const list = surfaces.get(surfaceName);
		if (!list || list.length === 0) return null;
		const source = random_choice(list);
		if (!source) return null;

		if (pool) {
			const listenerX = options.listenerX ?? pool.last_listener_x ?? 0;
			const listenerY = options.listenerY ?? pool.last_listener_y ?? 0;
			const listenerZ = options.listenerZ ?? pool.last_listener_z ?? 0;
			const rotation = options.rotation ?? pool.last_listener_rotation ?? 0;
			const filename = typeof source === 'string' ? source : String(source);
			return pool.play_3d(filename, listenerX, listenerY, listenerZ, x, y, z, rotation, false);
		}

		if (audio) {
			const handle = getHandle(source);
			if (typeof handle.setPosition === 'function') {
				handle.setPosition([x, y, z]);
			}
			return handle.play(options);
		}

		return null;
	}

	return {
		registerSurface,
		addSound,
		getSounds,
		hasSurface,
		playStep,
		clear() {
			surfaces.clear();
			handles.clear();
		},
	};
}
