export type AudioPosition = [number, number, number];

export interface AudioOrientation {
	forward: [number, number, number];
	up: [number, number, number];
}

// Position of a point in the listener's frame of reference. `forward` is
// negative when the point is behind, `right` is negative when it is to the left.
export interface ListenerRelative {
	right: number;
	forward: number;
	up: number;
}

export function to_audio_position(x: number, y: number, z: number, y_is_elevation?: boolean): AudioPosition;
export function orientation_from_rotation(rotation?: number): AudioOrientation;
export function listener_relative(
	x: number, y: number, z: number,
	listener_x: number, listener_y: number, listener_z: number,
	rotation?: number, y_is_elevation?: boolean,
): ListenerRelative;
