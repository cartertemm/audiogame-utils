// Ported from sound_pool.nvgt, originally from BGT (Copyright 2010-2014 Blastbay
// Studios, zlib like license). Method and property names are kept identical to
// the original so NVGT code and documentation translate directly.
//
// Two differences follow from the browser. Loading is asynchronous, so
// `play_*()` reserves and returns its slot right away and attaches the sound
// when it arrives. Out of earshot sounds release their audio nodes instead of
// closing a file handle, because the decoded buffer stays in the engine cache.

import { vector, calculate_theta } from '../rotation.js';
import { to_audio_position, orientation_from_rotation, listener_relative } from './coords.js';
import { db_to_volume, pan_to_stereo, pitch_to_rate, inverse_gain } from './units.js';
import { get_shared_engine } from './engine.js';

export let sound_pool_default_y_elevation = false;

export function set_sound_pool_default_y_elevation(value) {
	sound_pool_default_y_elevation = value;
}

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

export class sound_pool_item {
	constructor(pool) {
		this.pool = pool;
		this.handle = null;
		this.loading = null;
		this.generation = 0;
		this.in_use = false;
		this.reset();
	}

	reset() {
		if (this.handle) this.handle.stop();
		this.handle = null;
		this.loading = null;
		this.generation++;
		this.in_use = false;
		this.applied_rate = null;
		this.applied_volume = null;
		this.filename = "";
		this.owner = "";
		this.y_is_elevation = false;
		this.priority = 0;
		this.x = 0;
		this.y = 0;
		this.z = 0;
		this.theta = 0;
		this.pivit = vector();
		this.looping = false;
		this.pan_step = 0.0;
		this.volume_step = 0.0;
		this.behind_pitch_decrease = 0.0;
		this.start_pan = 0.0;
		this.start_volume = 0.0;
		this.start_pitch = 100.0;
		this.upper_range = 0;
		this.lower_range = 0;
		this.left_range = 0;
		this.right_range = 0;
		this.backward_range = 0;
		this.forward_range = 0;
		this.is_3d = false;
		this.paused = false;
		this.stationary = false;
		this.occlude = true;
		this.start_offset = 0.0;
		this.persistent = false;
		this.pan_type = 'HRTF';
		this.destination = null;
		this.extra_data = "";
	}

	get active() {
		return this.handle !== null || this.loading !== null;
	}

	get playing() {
		return this.handle ? this.handle.isPlaying : this.loading !== null;
	}

	// Releases the audio nodes but keeps the slot, so an out of earshot looping
	// sound can come back when the listener returns.
	close() {
		if (this.handle) this.handle.stop();
		this.handle = null;
		this.loading = null;
		this.generation++;
		this.applied_rate = null;
		this.applied_volume = null;
	}

	spawn(start_playing = true) {
		if (this.handle || this.loading || this.filename === "") return;
		const engine = this.pool.get_engine();
		if (!engine) return;
		const gen = this.generation;
		this.loading = engine.load(this.filename, { panType: this.pan_type })
			.then(sound => {
				if (gen !== this.generation) return;
				const inst = engine.spawn(sound, {
					loop: this.looping,
					offset: this.start_offset,
					destination: this.destination,
				});
				if (!inst) return;
				this.handle = inst;
				this.applied_rate = null;
				this.applied_volume = null;
				this.pool.apply_listener();
				this.apply_start_values();
				this.update_listener_position(this.pool.last_listener_x, this.pool.last_listener_y, this.pool.last_listener_z, this.pool.last_listener_rotation);
				if (start_playing && !this.paused) engine.start(inst, { loop: this.looping });
			})
			.catch(err => {
				console.warn('sound_pool could not load', this.filename, err);
			})
			.finally(() => {
				if (gen === this.generation) this.loading = null;
			});
	}

	// Cacophony rolls its playback position forward every time you assign a rate,
	// and a rate of zero is an error, so only write these when they change.
	set_rate(rate) {
		if (!this.handle || rate === this.applied_rate) return;
		this.applied_rate = rate;
		this.handle.playbackRate = rate;
	}

	set_volume(volume) {
		if (!this.handle || volume === this.applied_volume) return;
		this.applied_volume = volume;
		this.handle.volume = volume;
	}

	apply_start_values() {
		const handle = this.handle;
		if (!handle) return;
		this.set_volume(db_to_volume(this.start_volume));
		this.set_rate(pitch_to_rate(this.start_pitch));
		if (handle.panType === 'stereo') handle.stereoPan = pan_to_stereo(this.start_pan);
		else this.apply_positioning_values();
	}

	apply_positioning_values() {
		const handle = this.handle;
		if (!handle || handle.panType !== 'HRTF') return;
		handle.threeDOptions = {
			distanceModel: 'inverse',
			refDistance: 1,
			rolloffFactor: this.volume_step,
			maxDistance: this.pool.max_distance > 0 ? this.pool.max_distance : 10000,
		};
	}

	update(listener_x, listener_y, listener_z, rotation, max_distance) {
		if (!this.in_use) return;
		if (max_distance > 0 && this.looping && this.filename !== "") {
			const total_distance = this.get_total_distance(listener_x, listener_y, listener_z);
			if (total_distance > max_distance && this.active) {
				this.close();
				return;
			}
			if (total_distance <= max_distance && !this.active) {
				this.spawn();
				return;
			}
		}
		this.update_listener_position(listener_x, listener_y, listener_z, rotation);
	}

	// The pool sets the Web Audio listener position and orientation, so sounds
	// are placed in world coordinates rather than rotated around the listener.
	update_listener_position(listener_x, listener_y, listener_z, rotation) {
		const handle = this.handle;
		if (!handle || this.stationary) return;
		const true_x = clamp(listener_x, this.x - this.left_range, this.x + this.right_range);
		const true_y = clamp(listener_y, this.y - this.backward_range, this.y + this.forward_range);
		const true_z = clamp(listener_z, this.z - this.lower_range, this.z + this.upper_range);
		const inside = true_x === listener_x && true_y === listener_y && true_z === listener_z;
		if (inside) {
			this.set_volume(db_to_volume(this.start_volume));
			this.set_rate(pitch_to_rate(this.start_pitch));
			if (handle.panType === 'stereo') handle.stereoPan = 0;
			else handle.position = to_audio_position(listener_x, listener_y, listener_z, this.y_is_elevation);
			return;
		}
		const rel = listener_relative(true_x, true_y, true_z, listener_x, listener_y, listener_z, rotation, this.y_is_elevation);
		if (handle.panType === 'stereo') {
			const distance = Math.sqrt(rel.right * rel.right + rel.forward * rel.forward + rel.up * rel.up);
			handle.stereoPan = clamp(rel.right / Math.max(1, distance), -1, 1) * this.pan_step;
			this.set_volume(db_to_volume(this.start_volume) * inverse_gain(distance, 1, this.volume_step));
		} else {
			handle.position = to_audio_position(true_x, true_y, true_z, this.y_is_elevation);
		}
		let pitch = this.start_pitch;
		if (rel.forward < 0) pitch -= this.behind_pitch_decrease;
		if (rel.up < 0) pitch -= this.behind_pitch_decrease;
		this.set_rate(pitch_to_rate(pitch));
	}

	get_total_distance(listener_x, listener_y, listener_z) {
		if (this.stationary) return 0;
		const delta_left = this.x - this.left_range;
		const delta_right = this.x + this.right_range;
		const delta_backward = this.y - this.backward_range;
		const delta_forward = this.y + this.forward_range;
		const delta_lower = this.z - this.lower_range;
		const delta_upper = this.z + this.upper_range;
		if (!this.is_3d) {
			if (listener_x >= delta_left && listener_x <= delta_right) return 0;
			if (listener_x < delta_left) return delta_left - listener_x;
			return listener_x - delta_right;
		}
		const true_x = clamp(listener_x, delta_left, delta_right);
		const true_y = clamp(listener_y, delta_backward, delta_forward);
		const true_z = clamp(listener_z, delta_lower, delta_upper);
		return Math.abs(listener_x - true_x) + Math.abs(listener_y - true_y) + Math.abs(listener_z - true_z);
	}
}

export class sound_pool {
	constructor(default_item_size = 100, { engine = null } = {}) {
		this.y_is_elevation = sound_pool_default_y_elevation;
		this.max_distance = 0;
		this.pan_step = 1.0;
		this.volume_step = 1.0;
		this.behind_pitch_decrease = 0.25;
		this.hrtf = true;
		this.occlude = true;
		this.mixer = null;
		this.last_listener_x = 0;
		this.last_listener_y = 0;
		this.last_listener_z = 0;
		this.last_listener_rotation = 0.0;
		this.highest_slot = 0;
		this.clean_frequency = 3;
		this.engine = engine;
		this.items = [];
		for (let i = 0; i < default_item_size; i++)
			this.items.push(new sound_pool_item(this));
	}

	get_engine() {
		if (!this.engine) this.engine = get_shared_engine();
		return this.engine;
	}

	apply_listener() {
		const engine = this.get_engine();
		if (!engine) return;
		engine.setListener({
			position: to_audio_position(this.last_listener_x, this.last_listener_y, this.last_listener_z, this.y_is_elevation),
			orientation: orientation_from_rotation(this.last_listener_rotation),
		});
	}

	play_extended(dimension, filename, listener_x, listener_y, listener_z, sound_x, sound_y, sound_z, rotation, left_range, right_range, backward_range, forward_range, lower_range, upper_range, looping, offset, start_pan, start_volume, start_pitch, persistent = false, mix = null, start_playing = true, theta = 0) {
		const slot = this.reserve_slot();
		if (slot === -1) return -1;
		const item = this.items[slot];
		item.y_is_elevation = this.y_is_elevation;
		item.filename = filename;
		item.x = sound_x;
		item.y = sound_y;
		item.z = sound_z;
		item.looping = looping;
		item.pan_step = this.pan_step;
		item.volume_step = this.volume_step;
		item.behind_pitch_decrease = this.behind_pitch_decrease;
		item.stationary = dimension === 0;
		item.left_range = left_range;
		item.right_range = right_range;
		item.backward_range = backward_range;
		item.forward_range = forward_range;
		item.lower_range = lower_range;
		item.upper_range = upper_range;
		item.occlude = this.occlude;
		item.is_3d = true;
		if (filename !== "") item.start_offset = offset;
		item.start_pan = start_pan;
		item.start_volume = start_volume;
		item.start_pitch = start_pitch;
		item.persistent = persistent;
		item.theta = theta;
		item.paused = !start_playing;
		item.pan_type = (item.stationary || !this.hrtf) ? 'stereo' : 'HRTF';
		item.destination = mix || this.mixer;
		if (dimension > 0) this.last_listener_x = listener_x;
		if (dimension > 1) {
			this.last_listener_y = listener_y;
			this.last_listener_rotation = rotation;
		}
		if (dimension > 2) this.last_listener_z = listener_z;
		if (filename !== "") {
			const out_of_earshot = dimension > 1 && this.max_distance > 0 && item.get_total_distance(listener_x, listener_y, dimension === 2 ? 0 : listener_z) > this.max_distance;
			if (out_of_earshot && !looping) {
				item.reset();
				return -2;
			}
			if (!out_of_earshot) item.spawn(start_playing);
		}
		if (slot > this.highest_slot) this.highest_slot = slot;
		return slot;
	}

	play_stationary(filename, looping, persistent = false) {
		return this.play_extended(0, filename, 0, 0, 0, 0, 0, 0, 0.0, 0, 0, 0, 0, 0, 0, looping, 0, 0.0, 0.0, 100.0, persistent);
	}

	play_stationary_extended(filename, looping, offset, start_pan, start_volume, start_pitch, persistent = false, mix = null) {
		return this.play_extended(0, filename, 0, 0, 0, 0, 0, 0, 0.0, 0, 0, 0, 0, 0, 0, looping, offset, start_pan, start_volume, start_pitch, persistent, mix);
	}

	play_1d(filename, listener_x, sound_x, looping, persistent = false) {
		return this.play_extended(1, filename, listener_x, 0, 0, sound_x, 0, 0, 0.0, 0, 0, 0, 0, 0, 0, looping, 0, 0.0, 0.0, 100.0, persistent);
	}

	play_extended_1d(filename, listener_x, sound_x, left_range, right_range, looping, offset, start_pan, start_volume, start_pitch, persistent = false, mix = null) {
		return this.play_extended(1, filename, listener_x, 0, 0, sound_x, 0, 0, 0.0, left_range, right_range, 0, 0, 0, 0, looping, offset, start_pan, start_volume, start_pitch, persistent, mix);
	}

	// play_2d(filename, listener_x, listener_y, sound_x, sound_y, looping, persistent)
	// play_2d(filename, listener_x, listener_y, sound_x, sound_y, rotation, looping, persistent)
	play_2d(filename, listener_x, listener_y, sound_x, sound_y, ...rest) {
		const rotation = typeof rest[0] === 'boolean' ? 0.0 : rest.shift();
		const [looping, persistent = false] = rest;
		return this.play_extended(2, filename, listener_x, listener_y, 0, sound_x, sound_y, 0, rotation, 0, 0, 0, 0, 0, 0, looping, 0, 0.0, 0.0, 100.0, persistent);
	}

	// play_extended_2d(filename, listener_x, listener_y, sound_x, sound_y, [rotation,] left_range, right_range, backward_range, forward_range, looping, offset, start_pan, start_volume, start_pitch, persistent, mix)
	play_extended_2d(filename, listener_x, listener_y, sound_x, sound_y, ...rest) {
		const rotation = typeof rest[4] === 'boolean' ? 0.0 : rest.shift();
		const [left_range, right_range, backward_range, forward_range, looping, offset, start_pan, start_volume, start_pitch, persistent = false, mix = null] = rest;
		return this.play_extended(2, filename, listener_x, listener_y, 0, sound_x, sound_y, 0, rotation, left_range, right_range, backward_range, forward_range, 0, 0, looping, offset, start_pan, start_volume, start_pitch, persistent, mix);
	}

	// play_3d(filename, listener_x, listener_y, listener_z, sound_x, sound_y, sound_z, rotation, looping, persistent)
	// play_3d(filename, listener, sound_coordinate, rotation, looping, persistent)
	play_3d(filename, ...rest) {
		if (typeof rest[0] === 'object') {
			const [listener, coordinate, rotation, looping, persistent = false] = rest;
			return this.play_3d(filename, listener.x, listener.y, listener.z, coordinate.x, coordinate.y, coordinate.z, rotation, looping, persistent);
		}
		const [listener_x, listener_y, listener_z, sound_x, sound_y, sound_z, rotation, looping, persistent = false] = rest;
		return this.play_extended(3, filename, listener_x, listener_y, listener_z, sound_x, sound_y, sound_z, rotation, 0, 0, 0, 0, 0, 0, looping, 0, 0.0, 0.0, 100.0, persistent);
	}

	play_extended_3d(filename, listener_x, listener_y, listener_z, sound_x, sound_y, sound_z, rotation, left_range, right_range, backward_range, forward_range, lower_range, upper_range, looping, offset, start_pan, start_volume, start_pitch, persistent = false, mix = null, start_playing = true, theta = 0) {
		return this.play_extended(3, filename, listener_x, listener_y, listener_z, sound_x, sound_y, sound_z, rotation, left_range, right_range, backward_range, forward_range, lower_range, upper_range, looping, offset, start_pan, start_volume, start_pitch, persistent, mix, start_playing, theta);
	}

	sound_is_active(slot) {
		if (!this.verify_slot(slot)) return false;
		const item = this.items[slot];
		if (item.looping) return true;
		return item.active && item.playing;
	}

	sound_is_playing(slot) {
		if (!this.sound_is_active(slot)) return false;
		return this.items[slot].playing;
	}

	pause_sound(slot) {
		if (!this.sound_is_active(slot)) return false;
		const item = this.items[slot];
		if (item.paused) return false;
		item.paused = true;
		if (item.handle && item.handle.isPlaying) item.handle.pause();
		return true;
	}

	resume_sound(slot) {
		if (!this.verify_slot(slot)) return false;
		const item = this.items[slot];
		if (!item.paused && item.filename !== "") return false;
		item.paused = false;
		if (item.filename !== "" && this.max_distance > 0 && item.get_total_distance(this.last_listener_x, this.last_listener_y, this.last_listener_z) > this.max_distance) {
			item.close();
			return true;
		}
		item.update(this.last_listener_x, this.last_listener_y, this.last_listener_z, this.last_listener_rotation, this.max_distance);
		if (item.handle && !item.handle.isPlaying) this.get_engine()?.start(item.handle, { loop: item.looping });
		else if (!item.active) item.spawn();
		return true;
	}

	pause_all() {
		for (let i = 0; i < this.items.length; i++)
			this.pause_sound(i);
	}

	resume_all() {
		for (let i = 0; i < this.items.length; i++)
			this.resume_sound(i);
	}

	destroy_all() {
		for (let i = 0; i < this.items.length; i++)
			this.items[i].reset();
		this.highest_slot = 0;
	}

	update_listener_1d(listener_x) {
		this.update_listener_3d(listener_x, 0, 0, 0.0);
	}

	update_listener_2d(listener_x, listener_y, rotation = 0.0) {
		this.update_listener_3d(listener_x, listener_y, 0, rotation);
	}

	// update_listener_3d(listener_x, listener_y, listener_z, rotation, refresh_y_is_elevation)
	// update_listener_3d(listener, rotation, refresh_y_is_elevation)
	update_listener_3d(...args) {
		let listener_x, listener_y, listener_z, rotation, refresh_y_is_elevation;
		if (typeof args[0] === 'object') {
			const [listener, r = 0.0, refresh = true] = args;
			listener_x = listener.x;
			listener_y = listener.y;
			listener_z = listener.z;
			rotation = r;
			refresh_y_is_elevation = refresh;
		} else {
			const [x, y, z, r = 0.0, refresh = true] = args;
			listener_x = x;
			listener_y = y;
			listener_z = z;
			rotation = r;
			refresh_y_is_elevation = refresh;
		}
		if (this.items.length === 0) return;
		this.last_listener_x = listener_x;
		this.last_listener_y = listener_y;
		this.last_listener_z = listener_z;
		this.last_listener_rotation = rotation;
		if (refresh_y_is_elevation) this.y_is_elevation = sound_pool_default_y_elevation;
		this.apply_listener();
		for (let i = 0; i <= this.highest_slot && i < this.items.length; i++) {
			if (refresh_y_is_elevation) this.items[i].y_is_elevation = this.y_is_elevation;
			this.items[i].update(listener_x, listener_y, listener_z, rotation, this.max_distance);
		}
	}

	set_sound_owner(slot, owner, priority = 0) {
		if (!this.verify_slot(slot)) return false;
		this.items[slot].owner = owner;
		this.items[slot].priority = priority;
		return true;
	}

	get_sound_by_owner(owner, priority = 0) {
		for (let i = 0; i <= this.highest_slot && i < this.items.length; i++) {
			if (this.items[i].owner.startsWith(owner) && this.items[i].priority === priority)
				return i;
		}
		return -1;
	}

	update_sound_1d(slot, x) {
		return this.update_sound_3d(slot, x, 0, 0);
	}

	update_sound_2d(slot, x, y) {
		return this.update_sound_3d(slot, x, y, 0);
	}

	// update_sound_3d(slot, x, y, z)
	// update_sound_3d(slot, coordinate)
	update_sound_3d(slot, x, y, z) {
		if (typeof x === 'object') return this.update_sound_3d(slot, x.x, x.y, x.z);
		if (!this.verify_slot(slot)) return false;
		const item = this.items[slot];
		item.x = x;
		item.y = y;
		item.z = z;
		item.update(this.last_listener_x, this.last_listener_y, this.last_listener_z, this.last_listener_rotation, this.max_distance);
		return true;
	}

	// update_sounds_3d(owner, x, y, z, rotation)
	// update_sounds_3d(owner, coordinate, rotation)
	update_sounds_3d(owner, x, y, z, rotation = -1) {
		if (typeof x === 'object') return this.update_sounds_3d(owner, x.x, x.y, x.z, y === undefined ? -1 : y);
		for (let slot = 0; slot <= this.highest_slot && slot < this.items.length; slot++) {
			const item = this.items[slot];
			if (item.stationary || !item.owner.startsWith(owner)) continue;
			item.x = x;
			item.y = y;
			item.z = z;
			if (rotation >= 0) item.theta = calculate_theta(rotation);
			item.update(this.last_listener_x, this.last_listener_y, this.last_listener_z, this.last_listener_rotation, this.max_distance);
		}
		return true;
	}

	set_sound_rotation(slot, rotation, pivit) {
		if (!this.verify_slot(slot)) return false;
		const item = this.items[slot];
		item.theta = rotation;
		item.pivit = pivit;
		item.update(this.last_listener_x, this.last_listener_y, this.last_listener_z, this.last_listener_rotation, this.max_distance);
		return true;
	}

	set_sounds_rotation(owner, rotation, pivit) {
		for (let slot = 0; slot <= this.highest_slot && slot < this.items.length; slot++) {
			const item = this.items[slot];
			if (item.stationary || !item.owner.startsWith(owner)) continue;
			item.theta = rotation;
			item.pivit = pivit;
			item.update(this.last_listener_x, this.last_listener_y, this.last_listener_z, this.last_listener_rotation, this.max_distance);
		}
		return true;
	}

	set_sounds_amp(owner, priority, amp) {
		for (let slot = 0; slot <= this.highest_slot && slot < this.items.length; slot++) {
			const item = this.items[slot];
			if (!item.owner.startsWith(owner) || item.priority !== priority) continue;
			item.start_volume = amp;
			if (item.handle) item.handle.volume = db_to_volume(amp);
		}
		return true;
	}

	destroy_sounds(owner) {
		for (let slot = 0; slot <= this.highest_slot && slot < this.items.length; slot++) {
			if (this.items[slot].owner.startsWith(owner)) this.destroy_sound(slot);
		}
		return true;
	}

	update_sound_start_values(slot, start_pan, start_volume, start_pitch) {
		if (!this.verify_slot(slot)) return false;
		const item = this.items[slot];
		item.start_pan = start_pan;
		item.start_volume = start_volume;
		item.start_pitch = start_pitch;
		item.apply_start_values();
		return true;
	}

	update_sound_range_1d(slot, left_range, right_range) {
		return this.update_sound_range_3d(slot, left_range, right_range, 0, 0, 0, 0);
	}

	update_sound_range_2d(slot, left_range, right_range, backward_range, forward_range) {
		return this.update_sound_range_3d(slot, left_range, right_range, backward_range, forward_range, 0, 0);
	}

	update_sound_range_3d(slot, left_range, right_range, backward_range, forward_range, lower_range, upper_range, update_sound = true) {
		if (!this.verify_slot(slot)) return false;
		const item = this.items[slot];
		item.left_range = left_range;
		item.right_range = right_range;
		item.backward_range = backward_range;
		item.forward_range = forward_range;
		item.lower_range = lower_range;
		item.upper_range = upper_range;
		if (update_sound) item.update(this.last_listener_x, this.last_listener_y, this.last_listener_z, this.last_listener_rotation, this.max_distance);
		return true;
	}

	update_sound_positioning_values(slot, pan_step = -1, volume_step = -1, update_sound = true) {
		if (!this.verify_slot(slot)) return false;
		const item = this.items[slot];
		item.pan_step = pan_step < 0 ? this.pan_step : pan_step;
		item.volume_step = volume_step < 0 ? this.volume_step : volume_step;
		item.apply_positioning_values();
		if (update_sound) item.update(this.last_listener_x, this.last_listener_y, this.last_listener_z, this.last_listener_rotation, this.max_distance);
		return true;
	}

	destroy_sound(slot) {
		if (!this.verify_slot(slot)) return false;
		this.items[slot].reset();
		if (slot === this.highest_slot) this.find_highest_slot(this.highest_slot);
		return true;
	}

	// Internal methods.

	find_highest_slot(limit) {
		this.highest_slot = 0;
		for (let i = 0; i < limit && i < this.items.length; i++) {
			const item = this.items[i];
			if (!item.in_use) continue;
			if (!item.looping && !item.playing) continue;
			this.highest_slot = i;
		}
	}

	clean_unused() {
		if (this.items.length === 0) return;
		const limit = this.highest_slot;
		let killed_highest_slot = false;
		for (let i = 0; i <= limit && i < this.items.length; i++) {
			const item = this.items[i];
			if (item.persistent || item.looping || item.paused) continue;
			if (!item.handle || item.handle.isPlaying) continue;
			if (i === this.highest_slot) killed_highest_slot = true;
			item.reset();
		}
		if (killed_highest_slot) this.find_highest_slot(limit);
	}

	verify_slot(slot) {
		if (slot < 0 || slot >= this.items.length) return false;
		return this.items[slot].in_use;
	}

	reserve_slot() {
		this.clean_frequency -= 1;
		if (this.clean_frequency === 0) {
			this.clean_frequency = 3;
			this.clean_unused();
		}
		for (let i = 0; i < this.items.length; i++) {
			const item = this.items[i];
			if (item.persistent || item.looping || item.paused) continue;
			if (item.in_use && item.playing) continue;
			item.reset();
			item.in_use = true;
			return i;
		}
		return -1;
	}
}

export function create_sound_pool(default_item_size = 100, options = {}) {
	return new sound_pool(default_item_size, options);
}
