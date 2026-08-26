/** Web Audio Cartesian coordinates as `[right, up, back]`. */
/**
 * Conversions between game coordinates and Web Audio coordinates.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/audio.md | audio guide}.
 *
 * @module
 */
export type AudioPosition = [number, number, number];

/** Forward and up vectors for a Web Audio listener. */
export interface AudioOrientation {
	/** Unit vector pointing in the listener's facing direction. */
	forward: [number, number, number];
	/** Unit vector pointing upward. */
	up: [number, number, number];
}

/** Position of a point in the listener's frame of reference. */
export interface ListenerRelative {
	/** Rightward distance, negative when the point is left. */
	right: number;
	/** Forward distance, negative when the point is behind. */
	forward: number;
	/** Upward distance. */
	up: number;
}

/** Converts game coordinates to Web Audio coordinates. */
export function to_audio_position(x: number, y: number, z: number, y_is_elevation?: boolean): AudioPosition;
/** Returns Web Audio listener orientation vectors for a clockwise game rotation. */
export function orientation_from_rotation(rotation?: number): AudioOrientation;
/** Returns a point relative to a positioned and rotated listener. */
export function listener_relative(
	x: number, y: number, z: number,
	listener_x: number, listener_y: number, listener_z: number,
	rotation?: number, y_is_elevation?: boolean,
): ListenerRelative;
