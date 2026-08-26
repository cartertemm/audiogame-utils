/**
 * Direction, movement, distance, and spatial angle helpers.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/rotation.md | rotation guide}.
 *
 * @module
 */
/** Three dimensional coordinates using positive X east, positive Y north, and positive Z up. */
export interface Vector3 {
	/** East or west coordinate. */
	x: number;
	/** North or south coordinate. */
	y: number;
	/** Elevation coordinate. */
	z: number;
}

/** Approximation of pi retained for NVGT compatibility. */
export const pi: number;
/** North in degrees. */
export const north: number;
/** Northeast in degrees. */
export const northeast: number;
/** East in degrees. */
export const east: number;
/** Southeast in degrees. */
export const southeast: number;
/** South in degrees. */
export const south: number;
/** Southwest in degrees. */
export const southwest: number;
/** West in degrees. */
export const west: number;
/** Northwest in degrees. */
export const northwest: number;

/** Forty five degrees above the horizontal plane. */
export const half_up: number;
/** Ninety degrees above the horizontal plane. */
export const straight_up: number;
/** One hundred thirty five degrees from up toward down. */
export const half_down: number;
/** One hundred eighty degrees from up, pointing straight down. */
export const straight_down: number;

/** Sixteen compass direction labels at 22.5 degree intervals. */
export const detailed_rotation_directions: string[];
/** Eight compass direction labels at 45 degree intervals. */
export const rotation_directions: string[];

/** Creates a coordinate vector, defaulting each component to zero. */
export function vector(x?: number, y?: number, z?: number): Vector3;

/** Returns a new vector one unit from a position at horizontal and optional vertical angles. */
export function move(x: number, y: number, deg: number, dir?: number): Vector3;
/** Returns a new three dimensional vector after horizontal movement. */
export function move(x: number, y: number, z: number, deg: number, dir: number): Vector3;
/** Returns a new three dimensional vector after horizontal and vertical movement. */
export function move(x: number, y: number, z: number, deg: number, zdeg: number, dir: number, zdir: number): Vector3;

/** Converts degrees to radians using the module's NVGT compatible pi constant. */
export function calculate_theta(deg: number): number;
/** Returns the nearest eight way direction index for a facing angle. */
export function getdir(facing: number): number;
/** Moves a direction left by an increment and wraps once around zero. */
export function snapleft(deg: number, direction: number, inc?: number): number;
/** Moves a direction right by an increment and wraps once around 360. */
export function snapright(deg: number, direction: number, inc?: number): number;
/** Subtracts an increment from an angle without wrapping. */
export function turnleft(deg: number, inc: number): number;
/** Adds an increment to an angle without wrapping. */
export function turnright(deg: number, inc: number): number;
/** Wraps an integer angle into the inclusive range from `0` through `359`. */
export function degree_limit(deg: number): number;
/** Returns an eight way or sixteen way compass label for a direction. */
export function dir_to_string(direction: number, more_detail?: boolean): string;

/** Returns absolute distance along one axis. */
export function get_1d_distance(x1: number, x2: number): number;
/** Returns Euclidean distance between two points on the horizontal plane. */
export function get_2d_distance(x1: number, y1: number, x2: number, y2: number): number;
/** Returns Euclidean distance between two three dimensional points. */
export function get_3d_distance(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number;
/** Returns Euclidean distance between two coordinate vectors. */
export function get_3d_distance(c1: Vector3, c2: Vector3): number;
/** Returns the distance from a point to the nearest point inside an axis aligned box. */
export function get_clamped_3d_distance(current: Vector3, min: Vector3, max: Vector3): number;

/** Returns axis summed distance for numeric arguments and Euclidean distance for vectors. */
export function get_3d_distance_circle(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number;
/** Returns Euclidean distance between two coordinate vectors. */
export function get_3d_distance_circle(c1: Vector3, c2: Vector3): number;

/** Returns the relative horizontal angle from a facing direction to a target point. */
export function calculate_x_y_angle(x1: number, y1: number, x2: number, y2: number, deg: number, at_least_1_tile?: boolean, floor_deg?: boolean): number;
/** Returns the relative angle from a point to the nearest point inside a box. */
export function calculate_clamped_x_y_angle(current: Vector3, min: Vector3, max: Vector3, deg: number, at_least_1_tile?: boolean, floor_deg?: boolean): number;
/** Describes a relative horizontal angle in words. */
export function calculate_x_y_string(deg: number): string;
/** Describes a relative horizontal angle and elevation difference in words. */
export function calculate_x_y_string3d(deg: number, z1: number, z2: number): string;
