export interface Vector3 {
	x: number;
	y: number;
	z: number;
}

export const pi: number;
export const north: number;
export const northeast: number;
export const east: number;
export const southeast: number;
export const south: number;
export const southwest: number;
export const west: number;
export const northwest: number;

export const half_up: number;
export const straight_up: number;
export const half_down: number;
export const straight_down: number;

export const detailed_rotation_directions: string[];
export const rotation_directions: string[];

export function vector(x?: number, y?: number, z?: number): Vector3;

export function move(x: number, y: number, deg: number, dir?: number): Vector3;
export function move(x: number, y: number, z: number, deg: number, dir: number): Vector3;
export function move(x: number, y: number, z: number, deg: number, zdeg: number, dir: number, zdir: number): Vector3;

export function calculate_theta(deg: number): number;
export function getdir(facing: number): number;
export function snapleft(deg: number, direction: number, inc?: number): number;
export function snapright(deg: number, direction: number, inc?: number): number;
export function turnleft(deg: number, inc: number): number;
export function turnright(deg: number, inc: number): number;
export function degree_limit(deg: number): number;
export function dir_to_string(direction: number, more_detail?: boolean): string;

export function get_1d_distance(x1: number, x2: number): number;
export function get_2d_distance(x1: number, y1: number, x2: number, y2: number): number;
export function get_3d_distance(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number;
export function get_3d_distance(c1: Vector3, c2: Vector3): number;
export function get_clamped_3d_distance(current: Vector3, min: Vector3, max: Vector3): number;

export function get_3d_distance_circle(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number;
export function get_3d_distance_circle(c1: Vector3, c2: Vector3): number;

export function calculate_x_y_angle(x1: number, y1: number, x2: number, y2: number, deg: number, at_least_1_tile?: boolean, floor_deg?: boolean): number;
export function calculate_clamped_x_y_angle(current: Vector3, min: Vector3, max: Vector3, deg: number, at_least_1_tile?: boolean, floor_deg?: boolean): number;
export function calculate_x_y_string(deg: number): string;
export function calculate_x_y_string3d(deg: number, z1: number, z2: number): string;
