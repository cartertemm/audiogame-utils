import type { Vector3 } from './rotation.d.ts';

export interface SfxOptions {
	volume?: number;
	pan?: number;
	rate?: number;
	offset?: number;
	loop?: boolean;
	panType?: 'stereo' | 'HRTF';
	destination?: any;
	position?: [number, number, number];
	threeDOptions?: any;
}

export interface PlaybackHandle {
	stop(): void;
	pause?(): void;
	seek?(seconds: number): void;
	volume?: number;
	playbackRate?: number;
	stereoPan?: number;
	position?: [number, number, number];
}

export interface SfxHandle {
	load(): Promise<any>;
	play(options?: SfxOptions): Promise<PlaybackHandle | null>;
	stop(): Promise<void>;
}

export interface AudioOptions {
	engine?: any;
}

export interface AudioInstance {
	sfx(source: any): SfxHandle;
	preload(list?: SfxHandle[] | null): Promise<void>;
	dispose(): Promise<void>;
}

export interface CacophonyEngine {
	load(url: string, options?: { panType?: string; soundType?: any }): Promise<any>;
	spawn(handle: any, options?: SfxOptions): PlaybackHandle | null;
	start(inst: PlaybackHandle, options?: SfxOptions): PlaybackHandle | null;
	play(handle: any, options?: SfxOptions): PlaybackHandle | null;
	stop(inst: any): void;
	setPosition(handle: any, position: [number, number, number]): void;
	setListener(options?: { position?: [number, number, number]; orientation?: any }): boolean;
	ready(): Promise<any>;
}

export interface SoundPoolItem {
	handle: SfxHandle;
	play(x: number, y: number, z?: number, options?: SfxOptions): PlaybackHandle | null;
	update(x: number, y: number, z?: number): void;
	stop(): void;
}

export interface SoundPool {
	play(source: any, x: number, y: number, z?: number, options?: SfxOptions): SoundPoolItem;
	updateListener(x: number, y: number, z?: number, rotation?: number): void;
	clear(): void;
}

export function createAudio(options?: AudioOptions): AudioInstance;
export function createSfx(getEngine: () => Promise<any>, source: any): SfxHandle;
export function createCacophonyEngine(): CacophonyEngine;
export function get_shared_engine(): any;
export function audio_available(): boolean;

export function create_sound_pool(audio: AudioInstance): SoundPool;
export function sound_pool(audio: AudioInstance): SoundPool;
export function sound_pool_item(audio: AudioInstance, source: any): SoundPoolItem;
export const sound_pool_default_y_elevation: boolean;
export function set_sound_pool_default_y_elevation(value: boolean): void;

export function to_audio_position(x: number, y: number, z: number, y_is_elevation?: boolean): [number, number, number];
export function orientation_from_rotation(rotation?: number): { forward: [number, number, number]; up: [number, number, number] };
export function listener_relative(x: number, y: number, z: number, listener_x: number, listener_y: number, listener_z: number, rotation?: number, y_is_elevation?: boolean): { right: number; forward: number; up: number };

export function db_to_volume(db: number): number;
export function volume_to_db(volume: number): number;
export function pan_to_stereo(pan: number): number;
export function stereo_to_pan(stereo: number): number;
export function pitch_to_rate(pitch: number): number;
export function rate_to_pitch(rate: number): number;
export function inverse_gain(distance: number, ref_distance?: number, rolloff?: number): number;
