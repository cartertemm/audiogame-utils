/**
 * Range, interpolation, angle, and randomization helpers.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/math.md | math guide}.
 *
 * @module
 */
/** Restricts a number to the inclusive range between `min` and `max`. */
export function clamp(value: number, min: number, max: number): number;
/** Linearly interpolates between `a` and `b` by `t`. */
export function lerp(a: number, b: number, t: number): number;
/** Returns the interpolation factor of `value` between `a` and `b`. */
export function inverse_lerp(a: number, b: number, value: number): number;
/** Converts a value from one linear range to another. */
export function range_convert(value: number, in_min: number, in_max: number, out_min: number, out_max: number): number;
/** Returns the shortest signed difference in degrees from one angle to another. */
export function angle_difference(from: number, to: number): number;
/** Wraps a value into the range from `min` inclusive to `max` exclusive. */
export function wrap(value: number, min: number, max: number): number;
/** Returns a random integer in the inclusive range from `min` through `max`. */
export function random_int(min: number, max: number): number;
/** Returns a random floating point number between `min` inclusive and `max` exclusive. */
export function random_float(min?: number, max?: number): number;
/** Returns a uniformly selected list item, or `undefined` for an empty list. */
export function random_choice<T>(list: T[]): T | undefined;
/** Returns a list item selected according to its corresponding nonnegative weight. */
export function weighted_choice<T>(list: T[], weights: number[]): T | undefined;
/** Shuffles a list in place and returns the same list. */
export function shuffle<T>(list: T[]): T[];
