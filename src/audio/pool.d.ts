import type { Vector3 } from '../rotation.js';
import type { CacophonyEngine, PlaybackHandle } from './engine.js';

// Method and property names match sound_pool.nvgt, so NVGT code and
// documentation translate directly.

// Slot index into `sound_pool.items`, or -1 when no slot was free and -2 when a
// non-looping sound started out of earshot.
export type SoundPoolSlot = number;

export interface SoundPoolOptions {
	engine?: CacophonyEngine | null;
}

export let sound_pool_default_y_elevation: boolean;
export function set_sound_pool_default_y_elevation(value: boolean): void;

export class sound_pool_item {
	constructor(pool: sound_pool);

	pool: sound_pool;
	handle: PlaybackHandle | null;
	loading: Promise<void> | null;
	generation: number;
	in_use: boolean;
	applied_rate: number | null;
	applied_volume: number | null;
	filename: string;
	owner: string;
	y_is_elevation: boolean;
	priority: number;
	x: number;
	y: number;
	z: number;
	theta: number;
	pivit: Vector3;
	looping: boolean;
	pan_step: number;
	volume_step: number;
	behind_pitch_decrease: number;
	start_pan: number;
	start_volume: number;
	start_pitch: number;
	upper_range: number;
	lower_range: number;
	left_range: number;
	right_range: number;
	backward_range: number;
	forward_range: number;
	is_3d: boolean;
	paused: boolean;
	stationary: boolean;
	occlude: boolean;
	start_offset: number;
	persistent: boolean;
	pan_type: 'stereo' | 'HRTF';
	destination: any;
	extra_data: string;

	readonly active: boolean;
	readonly playing: boolean;

	reset(): void;
	// Releases the audio nodes but keeps the slot, so an out of earshot looping
	// sound can come back when the listener returns.
	close(): void;
	spawn(start_playing?: boolean): void;
	set_rate(rate: number): void;
	set_volume(volume: number): void;
	apply_start_values(): void;
	apply_positioning_values(): void;
	update(listener_x: number, listener_y: number, listener_z: number, rotation: number, max_distance: number): void;
	update_listener_position(listener_x: number, listener_y: number, listener_z: number, rotation: number): void;
	get_total_distance(listener_x: number, listener_y: number, listener_z: number): number;
}

export class sound_pool {
	constructor(default_item_size?: number, options?: SoundPoolOptions);

	y_is_elevation: boolean;
	max_distance: number;
	pan_step: number;
	volume_step: number;
	behind_pitch_decrease: number;
	hrtf: boolean;
	occlude: boolean;
	mixer: any;
	last_listener_x: number;
	last_listener_y: number;
	last_listener_z: number;
	last_listener_rotation: number;
	highest_slot: number;
	clean_frequency: number;
	engine: CacophonyEngine | null;
	items: sound_pool_item[];

	get_engine(): CacophonyEngine | null;
	apply_listener(): void;

	// `dimension` is 0 for stationary, or 1, 2, or 3.
	play_extended(
		dimension: 0 | 1 | 2 | 3, filename: string,
		listener_x: number, listener_y: number, listener_z: number,
		sound_x: number, sound_y: number, sound_z: number,
		rotation: number,
		left_range: number, right_range: number,
		backward_range: number, forward_range: number,
		lower_range: number, upper_range: number,
		looping: boolean, offset: number,
		start_pan: number, start_volume: number, start_pitch: number,
		persistent?: boolean, mix?: any, start_playing?: boolean, theta?: number,
	): SoundPoolSlot;

	play_stationary(filename: string, looping: boolean, persistent?: boolean): SoundPoolSlot;
	play_stationary_extended(
		filename: string, looping: boolean, offset: number,
		start_pan: number, start_volume: number, start_pitch: number,
		persistent?: boolean, mix?: any,
	): SoundPoolSlot;

	play_1d(filename: string, listener_x: number, sound_x: number, looping: boolean, persistent?: boolean): SoundPoolSlot;
	play_extended_1d(
		filename: string, listener_x: number, sound_x: number,
		left_range: number, right_range: number,
		looping: boolean, offset: number,
		start_pan: number, start_volume: number, start_pitch: number,
		persistent?: boolean, mix?: any,
	): SoundPoolSlot;

	play_2d(filename: string, listener_x: number, listener_y: number, sound_x: number, sound_y: number, looping: boolean, persistent?: boolean): SoundPoolSlot;
	play_2d(filename: string, listener_x: number, listener_y: number, sound_x: number, sound_y: number, rotation: number, looping: boolean, persistent?: boolean): SoundPoolSlot;

	play_extended_2d(
		filename: string, listener_x: number, listener_y: number, sound_x: number, sound_y: number,
		left_range: number, right_range: number, backward_range: number, forward_range: number,
		looping: boolean, offset: number,
		start_pan: number, start_volume: number, start_pitch: number,
		persistent?: boolean, mix?: any,
	): SoundPoolSlot;
	play_extended_2d(
		filename: string, listener_x: number, listener_y: number, sound_x: number, sound_y: number,
		rotation: number,
		left_range: number, right_range: number, backward_range: number, forward_range: number,
		looping: boolean, offset: number,
		start_pan: number, start_volume: number, start_pitch: number,
		persistent?: boolean, mix?: any,
	): SoundPoolSlot;

	play_3d(
		filename: string,
		listener_x: number, listener_y: number, listener_z: number,
		sound_x: number, sound_y: number, sound_z: number,
		rotation: number, looping: boolean, persistent?: boolean,
	): SoundPoolSlot;
	play_3d(filename: string, listener: Vector3, sound_coordinate: Vector3, rotation: number, looping: boolean, persistent?: boolean): SoundPoolSlot;

	play_extended_3d(
		filename: string,
		listener_x: number, listener_y: number, listener_z: number,
		sound_x: number, sound_y: number, sound_z: number,
		rotation: number,
		left_range: number, right_range: number,
		backward_range: number, forward_range: number,
		lower_range: number, upper_range: number,
		looping: boolean, offset: number,
		start_pan: number, start_volume: number, start_pitch: number,
		persistent?: boolean, mix?: any, start_playing?: boolean, theta?: number,
	): SoundPoolSlot;

	sound_is_active(slot: SoundPoolSlot): boolean;
	sound_is_playing(slot: SoundPoolSlot): boolean;
	pause_sound(slot: SoundPoolSlot): boolean;
	resume_sound(slot: SoundPoolSlot): boolean;
	pause_all(): void;
	resume_all(): void;
	destroy_all(): void;

	update_listener_1d(listener_x: number): void;
	update_listener_2d(listener_x: number, listener_y: number, rotation?: number): void;
	update_listener_3d(listener_x: number, listener_y: number, listener_z: number, rotation?: number, refresh_y_is_elevation?: boolean): void;
	update_listener_3d(listener: Vector3, rotation?: number, refresh_y_is_elevation?: boolean): void;

	set_sound_owner(slot: SoundPoolSlot, owner: string, priority?: number): boolean;
	// -1 when no sound matches.
	get_sound_by_owner(owner: string, priority?: number): SoundPoolSlot;

	update_sound_1d(slot: SoundPoolSlot, x: number): boolean;
	update_sound_2d(slot: SoundPoolSlot, x: number, y: number): boolean;
	update_sound_3d(slot: SoundPoolSlot, x: number, y: number, z: number): boolean;
	update_sound_3d(slot: SoundPoolSlot, coordinate: Vector3): boolean;

	update_sounds_3d(owner: string, x: number, y: number, z: number, rotation?: number): boolean;
	update_sounds_3d(owner: string, coordinate: Vector3, rotation?: number): boolean;

	set_sound_rotation(slot: SoundPoolSlot, rotation: number, pivit: Vector3): boolean;
	set_sounds_rotation(owner: string, rotation: number, pivit: Vector3): boolean;
	set_sounds_amp(owner: string, priority: number, amp: number): boolean;
	destroy_sounds(owner: string): boolean;

	update_sound_start_values(slot: SoundPoolSlot, start_pan: number, start_volume: number, start_pitch: number): boolean;
	update_sound_range_1d(slot: SoundPoolSlot, left_range: number, right_range: number): boolean;
	update_sound_range_2d(slot: SoundPoolSlot, left_range: number, right_range: number, backward_range: number, forward_range: number): boolean;
	update_sound_range_3d(
		slot: SoundPoolSlot,
		left_range: number, right_range: number,
		backward_range: number, forward_range: number,
		lower_range: number, upper_range: number,
		update_sound?: boolean,
	): boolean;
	update_sound_positioning_values(slot: SoundPoolSlot, pan_step?: number, volume_step?: number, update_sound?: boolean): boolean;
	destroy_sound(slot: SoundPoolSlot): boolean;

	// Internal methods.
	find_highest_slot(limit: number): void;
	clean_unused(): void;
	verify_slot(slot: SoundPoolSlot): boolean;
	reserve_slot(): SoundPoolSlot;
}

export function create_sound_pool(default_item_size?: number, options?: SoundPoolOptions): sound_pool;
