// Manages surface footstep sound banks and spatial step sound playback.

import { random_choice } from '../math.js';
import { listener_relative } from './coords.js';
import { sound_pool_default_y_elevation } from './pool.js';

export function createSurfaceManager({ audio = null, pool = null } = {}) {
	if (!audio && !pool) {
		throw new Error('createSurfaceManager requires an audio instance or sound_pool');
	}
	const surfaces = new Map();
	const handles = new Map();

	function getHandle(source) {
		if (!handles.has(source)) {
			handles.set(source, audio.sfx(source, { panType: 'HRTF' }));
		}
		return handles.get(source);
	}

	function assertPlayable(source) {
		if (pool && typeof source !== 'string') {
			throw new Error('a sound_pool backed surface manager requires string sources');
		}
	}

	function assertSurfaceName(caller, name) {
		if (typeof name !== 'string' || name.length === 0) {
			throw new Error(`${caller} requires a valid surface name`);
		}
	}

	function registerSurface(name, sources = []) {
		assertSurfaceName('registerSurface', name);
		const list = Array.isArray(sources) ? [...sources] : [sources];
		list.forEach(assertPlayable);
		surfaces.set(name, list);
	}

	function addSound(surfaceName, source) {
		assertSurfaceName('addSound', surfaceName);
		assertPlayable(source);
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
			return pool.play_3d(source, listenerX, listenerY, listenerZ, x, y, z, rotation, false);
		}
		if (audio) {
			const handle = getHandle(source);
			// Position goes in the play options rather than on the handle, because
			// the handle wraps a cached Sound shared by every step from this file.
			// We do not want to move steps that are already playing.
			const { listenerX = 0, listenerY = 0, listenerZ = 0, rotation = 0, ...playOptions } = options;
			const rel = listener_relative(x, y, z, listenerX, listenerY, listenerZ, rotation, sound_pool_default_y_elevation);
			return handle.play({ ...playOptions, position: [rel.right, rel.up, -rel.forward] });
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
