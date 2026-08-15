// Converts between game coordinates and Web Audio coordinates.
//
// Games in the NVGT tradition use x for east, y for north, and z for elevation.
// Web Audio uses x for right, y for up, and negative z for forward. Set
// `y_is_elevation` when your game treats y as height and z as depth.

import { calculate_theta } from '../rotation.js';

export function to_audio_position(x, y, z, y_is_elevation = false) {
	return y_is_elevation ? [x, y, -z] : [x, z, -y];
}

export function orientation_from_rotation(rotation = 0) {
	const theta = calculate_theta(rotation);
	return { forward: [Math.sin(theta), 0, -Math.cos(theta)], up: [0, 1, 0] };
}

// Position of a point in the listener's frame of reference. `forward` is
// negative when the point is behind, `right` is negative when it is to the left.
export function listener_relative(x, y, z, listener_x, listener_y, listener_z, rotation = 0, y_is_elevation = false) {
	const dx = x - listener_x;
	const dy = y - listener_y;
	const dz = z - listener_z;
	const depth = y_is_elevation ? dz : dy;
	const up = y_is_elevation ? dy : dz;
	const theta = calculate_theta(rotation);
	const s = Math.sin(theta);
	const c = Math.cos(theta);
	return { right: dx * c - depth * s, forward: dx * s + depth * c, up };
}
