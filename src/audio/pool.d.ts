/**
 * Reusable spatial sound sources and listener updates.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/audio.md | audio guide}.
 *
 * @module
 */
import type { Vector3 } from '../physics/vector.js';
import type { CacophonyEngine, PlaybackHandle } from './engine.js';

/** Pool slot index, `-1` when full, or `-2` for an inaudible one shot sound. */
export type SoundPoolSlot = number;

/** Configuration for {@link create_sound_pool}. */
export interface SoundPoolOptions {
	/** Audio engine. Defaults to the shared engine when omitted. */
	engine?: CacophonyEngine | null;
}

/** Default interpretation of pool coordinates, where Y is elevation when true. */
export let sound_pool_default_y_elevation: boolean;
/** Sets the coordinate convention copied by new sound pools. */
export function set_sound_pool_default_y_elevation(value: boolean): void;

/** One reusable playback slot and its spatial state. */
export class sound_pool_item {
	/** Creates an unused slot owned by a sound pool. */
	constructor(pool: sound_pool);

	/** Owning sound pool. */
	pool: sound_pool;
	/** Current engine playback handle. */
	handle: PlaybackHandle | null;
	/** Pending asset load and spawn operation. */
	loading: Promise<void> | null;
	/** Revision used to invalidate stale asynchronous work. */
	generation: number;
	/** Whether this slot is reserved. */
	in_use: boolean;
	/** Last playback rate applied to the engine handle. */
	applied_rate: number | null;
	/** Last volume applied to the engine handle. */
	applied_volume: number | null;
	/** Audio asset URL. */
	filename: string;
	/** Application supplied owner name. */
	owner: string;
	/** Whether Y is interpreted as elevation instead of Z. */
	y_is_elevation: boolean;
	/** Application supplied owner priority. */
	priority: number;
	/** Sound X coordinate. */
	x: number;
	/** Sound Y coordinate. */
	y: number;
	/** Sound Z coordinate. */
	z: number;
	/** Sound facing rotation in degrees. */
	theta: number;
	/** Pivot point used for owner rotation. */
	pivit: Vector3;
	/** Whether playback repeats. */
	looping: boolean;
	/** Pan change per distance unit. */
	pan_step: number;
	/** Volume attenuation per distance unit. */
	volume_step: number;
	/** Pitch reduction applied behind the listener. */
	behind_pitch_decrease: number;
	/** Base NVGT pan. */
	start_pan: number;
	/** Base NVGT volume in decibels. */
	start_volume: number;
	/** Base NVGT pitch percentage. */
	start_pitch: number;
	/** Distance before attenuation above the sound. */
	upper_range: number;
	/** Distance before attenuation below the sound. */
	lower_range: number;
	/** Distance before attenuation left of the sound. */
	left_range: number;
	/** Distance before attenuation right of the sound. */
	right_range: number;
	/** Distance before attenuation behind the sound. */
	backward_range: number;
	/** Distance before attenuation in front of the sound. */
	forward_range: number;
	/** Whether this item uses spatial positioning. */
	is_3d: boolean;
	/** Whether playback was paused by the pool. */
	paused: boolean;
	/** Whether listener movement leaves positioning unchanged. */
	stationary: boolean;
	/** Whether the engine should apply occlusion when supported. */
	occlude: boolean;
	/** Playback starting offset in seconds. */
	start_offset: number;
	/** Whether cleanup retains the item while it is not playing. */
	persistent: boolean;
	/** Panning algorithm fixed for this item. */
	pan_type: 'stereo' | 'HRTF';
	/** Custom audio graph destination. */
	destination: any;
	/** Application supplied string data. */
	extra_data: string;

	/** Whether the slot is reserved and has a filename. */
	readonly active: boolean;
	/** Whether the engine handle reports active playback. */
	readonly playing: boolean;

	/** Stops playback and restores every slot property to its default. */
	reset(): void;
	/** Releases playback nodes while retaining the reserved slot. */
	close(): void;
	/** Loads and allocates playback, optionally starting it immediately. */
	spawn(start_playing?: boolean): void;
	/** Applies an NVGT pitch percentage to current playback. */
	set_rate(rate: number): void;
	/** Applies NVGT decibel volume to current playback. */
	set_volume(volume: number): void;
	/** Applies base pan, volume, pitch, and offset to current playback. */
	apply_start_values(): void;
	/** Applies current spatial pan, volume, and position values. */
	apply_positioning_values(): void;
	/** Recalculates playback for listener position, rotation, and hearing distance. */
	update(listener_x: number, listener_y: number, listener_z: number, rotation: number, max_distance: number): void;
	/** Updates only listener relative position for HRTF playback. */
	update_listener_position(listener_x: number, listener_y: number, listener_z: number, rotation: number): void;
	/** Returns distance from the listener after this item's free ranges. */
	get_total_distance(listener_x: number, listener_y: number, listener_z: number): number;
}

/** Reuses playback slots for stationary and spatial sound effects. */
export class sound_pool {
	/** Creates a pool with a preallocated slot count and optional engine. */
	constructor(default_item_size?: number, options?: SoundPoolOptions);

	/** Whether Y is interpreted as elevation instead of Z. */
	y_is_elevation: boolean;
	/** Maximum audible distance for nonstationary sounds. */
	max_distance: number;
	/** Default pan change per distance unit. */
	pan_step: number;
	/** Default volume attenuation per distance unit. */
	volume_step: number;
	/** Default pitch reduction behind the listener. */
	behind_pitch_decrease: number;
	/** Whether new spatial sounds use HRTF panning. */
	hrtf: boolean;
	/** Whether new sounds request occlusion when supported. */
	occlude: boolean;
	/** Default custom audio graph destination. */
	mixer: any;
	/** Latest listener X coordinate. */
	last_listener_x: number;
	/** Latest listener Y coordinate. */
	last_listener_y: number;
	/** Latest listener Z coordinate. */
	last_listener_z: number;
	/** Latest clockwise listener rotation in degrees. */
	last_listener_rotation: number;
	/** Highest currently reserved slot index. */
	highest_slot: number;
	/** Number of reservations between unused slot cleanup passes. */
	clean_frequency: number;
	/** Audio engine used by pool items. */
	engine: CacophonyEngine | null;
	/** Reusable playback slots. */
	items: sound_pool_item[];

	/** Resolves and caches the shared engine when no engine was supplied. */
	get_engine(): CacophonyEngine | null;
	/** Applies the latest position and orientation to the engine listener. */
	apply_listener(): void;

	/** Reserves and configures a sound with complete stationary or spatial options. */
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

	/** Plays a stationary sound with default playback values. */
	play_stationary(filename: string, looping: boolean, persistent?: boolean): SoundPoolSlot;
	/** Plays a stationary sound with explicit offset, pan, volume, and pitch. */
	play_stationary_extended(
		filename: string, looping: boolean, offset: number,
		start_pan: number, start_volume: number, start_pitch: number,
		persistent?: boolean, mix?: any,
	): SoundPoolSlot;

	/** Plays a one dimensional sound with default positioning ranges. */
	play_1d(filename: string, listener_x: number, sound_x: number, looping: boolean, persistent?: boolean): SoundPoolSlot;
	/** Plays a one dimensional sound with explicit ranges and playback values. */
	play_extended_1d(
		filename: string, listener_x: number, sound_x: number,
		left_range: number, right_range: number,
		looping: boolean, offset: number,
		start_pan: number, start_volume: number, start_pitch: number,
		persistent?: boolean, mix?: any,
	): SoundPoolSlot;

	/** Plays a two dimensional sound with optional listener rotation. */
	play_2d(filename: string, listener_x: number, listener_y: number, sound_x: number, sound_y: number, looping: boolean, persistent?: boolean): SoundPoolSlot;
	/** Plays a rotated two dimensional sound with default positioning ranges. */
	play_2d(filename: string, listener_x: number, listener_y: number, sound_x: number, sound_y: number, rotation: number, looping: boolean, persistent?: boolean): SoundPoolSlot;

	/** Plays a two dimensional sound with explicit ranges and playback values. */
	play_extended_2d(
		filename: string, listener_x: number, listener_y: number, sound_x: number, sound_y: number,
		left_range: number, right_range: number, backward_range: number, forward_range: number,
		looping: boolean, offset: number,
		start_pan: number, start_volume: number, start_pitch: number,
		persistent?: boolean, mix?: any,
	): SoundPoolSlot;
	/** Plays a rotated two dimensional sound with explicit ranges and playback values. */
	play_extended_2d(
		filename: string, listener_x: number, listener_y: number, sound_x: number, sound_y: number,
		rotation: number,
		left_range: number, right_range: number, backward_range: number, forward_range: number,
		looping: boolean, offset: number,
		start_pan: number, start_volume: number, start_pitch: number,
		persistent?: boolean, mix?: any,
	): SoundPoolSlot;

	/** Plays a three dimensional sound with default positioning ranges. */
	play_3d(
		filename: string,
		listener_x: number, listener_y: number, listener_z: number,
		sound_x: number, sound_y: number, sound_z: number,
		rotation: number, looping: boolean, persistent?: boolean,
	): SoundPoolSlot;
	/** Plays a three dimensional sound using listener and sound vectors. */
	play_3d(filename: string, listener: Vector3, sound_coordinate: Vector3, rotation: number, looping: boolean, persistent?: boolean): SoundPoolSlot;

	/** Plays a three dimensional sound with explicit ranges and playback values. */
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

	/** Returns whether a slot is reserved for a sound. */
	sound_is_active(slot: SoundPoolSlot): boolean;
	/** Returns whether a slot has active engine playback. */
	sound_is_playing(slot: SoundPoolSlot): boolean;
	/** Pauses a playing slot and reports whether it succeeded. */
	pause_sound(slot: SoundPoolSlot): boolean;
	/** Resumes a paused slot and reports whether it succeeded. */
	resume_sound(slot: SoundPoolSlot): boolean;
	/** Pauses every playing slot. */
	pause_all(): void;
	/** Resumes every paused slot. */
	resume_all(): void;
	/** Stops and resets every slot. */
	destroy_all(): void;

	/** Updates the listener on the X axis and refreshes active sounds. */
	update_listener_1d(listener_x: number): void;
	/** Updates the listener on the horizontal plane and refreshes active sounds. */
	update_listener_2d(listener_x: number, listener_y: number, rotation?: number): void;
	/** Updates a three dimensional listener and refreshes active sounds. */
	update_listener_3d(listener_x: number, listener_y: number, listener_z: number, rotation?: number, refresh_y_is_elevation?: boolean): void;
	/** Updates a three dimensional listener from a coordinate vector. */
	update_listener_3d(listener: Vector3, rotation?: number, refresh_y_is_elevation?: boolean): void;

	/** Assigns an owner and priority to a slot and reports whether it exists. */
	set_sound_owner(slot: SoundPoolSlot, owner: string, priority?: number): boolean;
	/** Returns the first slot matching an owner and optional priority, or `-1`. */
	get_sound_by_owner(owner: string, priority?: number): SoundPoolSlot;

	/** Updates a slot's one dimensional sound coordinate. */
	update_sound_1d(slot: SoundPoolSlot, x: number): boolean;
	/** Updates a slot's two dimensional sound coordinates. */
	update_sound_2d(slot: SoundPoolSlot, x: number, y: number): boolean;
	/** Updates a slot's three dimensional sound coordinates. */
	update_sound_3d(slot: SoundPoolSlot, x: number, y: number, z: number): boolean;
	/** Updates a slot's three dimensional sound coordinate from a vector. */
	update_sound_3d(slot: SoundPoolSlot, coordinate: Vector3): boolean;

	/** Updates coordinates and optional rotation for every sound owned by a name. */
	update_sounds_3d(owner: string, x: number, y: number, z: number, rotation?: number): boolean;
	/** Updates a coordinate vector and optional rotation for sounds owned by a name. */
	update_sounds_3d(owner: string, coordinate: Vector3, rotation?: number): boolean;

	/** Rotates one sound around a pivot and reports whether its slot exists. */
	set_sound_rotation(slot: SoundPoolSlot, rotation: number, pivit: Vector3): boolean;
	/** Rotates every sound owned by a name around a pivot. */
	set_sounds_rotation(owner: string, rotation: number, pivit: Vector3): boolean;
	/** Sets base volume for sounds matching an owner and priority. */
	set_sounds_amp(owner: string, priority: number, amp: number): boolean;
	/** Destroys every sound owned by a name and reports whether any matched. */
	destroy_sounds(owner: string): boolean;

	/** Replaces a slot's base pan, volume, and pitch values. */
	update_sound_start_values(slot: SoundPoolSlot, start_pan: number, start_volume: number, start_pitch: number): boolean;
	/** Replaces a slot's free range on the X axis. */
	update_sound_range_1d(slot: SoundPoolSlot, left_range: number, right_range: number): boolean;
	/** Replaces a slot's free ranges on the horizontal plane. */
	update_sound_range_2d(slot: SoundPoolSlot, left_range: number, right_range: number, backward_range: number, forward_range: number): boolean;
	/** Replaces a slot's free ranges in three dimensions. */
	update_sound_range_3d(
		slot: SoundPoolSlot,
		left_range: number, right_range: number,
		backward_range: number, forward_range: number,
		lower_range: number, upper_range: number,
		update_sound?: boolean,
	): boolean;
	/** Replaces a slot's pan and volume attenuation steps. */
	update_sound_positioning_values(slot: SoundPoolSlot, pan_step?: number, volume_step?: number, update_sound?: boolean): boolean;
	/** Stops and resets one slot. */
	destroy_sound(slot: SoundPoolSlot): boolean;

	/** Recalculates the highest active slot below a limit. */
	find_highest_slot(limit: number): void;
	/** Resets inactive nonpersistent slots. */
	clean_unused(): void;
	/** Returns whether a value identifies an existing active slot. */
	verify_slot(slot: SoundPoolSlot): boolean;
	/** Returns an available slot without growing the pool, or `-1` when none is available. */
	reserve_slot(): SoundPoolSlot;
}

/** Creates a reusable sound pool with optional preallocation and engine. */
export function create_sound_pool(default_item_size?: number, options?: SoundPoolOptions): sound_pool;
