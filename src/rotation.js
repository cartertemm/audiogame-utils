// Ported from rotation.nvgt, part of the NVGT scripting language (https://nvgt.dev).
// Function names and behavior are kept identical to the original so NVGT code and
// documentation translate directly.

export const pi = 3.1415926535897932384626433832795;
export const north = 0;
export const northeast = 45;
export const east = 90;
export const southeast = 135;
export const south = 180;
export const southwest = 225;
export const west = 270;
export const northwest = 315;
export const half_up = 45;
export const straight_up = 90;
export const half_down = 135;
export const straight_down = 180;
export const detailed_rotation_directions = ["north", "north - northeast", "northeast", "east - northeast", "east", "east - southeast", "southeast", "south - southeast", "south", "south - southwest", "southwest", "west - southwest", "west", "west - northwest", "northwest", "north - northwest"];
export const rotation_directions = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];

export function vector(x = 0, y = 0, z = 0) {
	return { x, y, z };
}

// move(x, y, deg, dir = 0.0)
// move(x, y, z, deg, dir)
// move(x, y, z, deg, zdeg, dir, zdir)
export function move(...args) {
	if (args.length <= 4) {
		const [x, y, deg, dir = 0.0] = args;
		return move(x, y, 0, deg, 0, dir, 0);
	}
	if (args.length <= 6) {
		const [x, y, z, deg, dir] = args;
		return move(x, y, z, deg, 0, dir, 0);
	}
	let [x, y, z, deg, zdeg, dir, zdir] = args;
	deg += dir;
	while (deg >= 360)
		deg -= 360;
	if (zdir !== 0.0) {
		zdeg += zdir;
		while (zdeg >= 360)
			zdeg -= 360;
	}
	const theta = calculate_theta(deg);
	const reflection = vector();
	if (deg !== 180) reflection.x = Math.sin(theta);
	if (deg !== 90 && deg !== 270) reflection.y = Math.cos(theta);
	if (zdeg !== 90 && zdeg !== 270) {
		const scale = Math.cos(calculate_theta(zdeg));
		reflection.x *= scale;
		reflection.y *= scale;
		reflection.z *= scale;
	} else {
		reflection.x = 0;
		reflection.y = 0;
		reflection.z = 0;
	}
	if (zdeg !== 180) reflection.z = Math.sin(calculate_theta(zdeg));
	return vector(x + reflection.x, y + reflection.y, z + reflection.z);
}

export function calculate_theta(deg) {
	return deg * pi / 180.0;
}

export function getdir(facing) {
	if (facing >= north && facing < northeast)
		return north;
	if (facing >= northeast && facing < east)
		return northeast;
	if (facing >= east && facing < southeast)
		return east;
	if (facing >= southeast && facing < south)
		return southeast;
	if (facing >= south && facing < southwest)
		return south;
	if (facing >= southwest && facing < west)
		return southwest;
	if (facing >= west && facing < northwest)
		return west;
	if (facing >= northwest)
		return northwest;
	return -1;
}

export function snapleft(deg, direction, inc = 45) {
	let d = direction - inc;
	if (d < 0)
		d += 360;
	return d;
}

export function snapright(deg, direction, inc = 45) {
	let d = direction + inc;
	if (d >= 360)
		d -= 360;
	return d;
}

export function turnleft(deg, inc) {
	deg -= inc;
	while (deg < 0)
		deg += 360;
	return deg;
}

export function turnright(deg, inc) {
	deg += inc;
	while (deg >= 360)
		deg -= 360;
	return deg;
}

export function degree_limit(deg) {
	while (deg < 0) deg += 360;
	while (deg > 359) deg -= 360;
	return deg;
}

export function dir_to_string(direction, more_detail = true) {
	direction %= 360;
	if (more_detail) {
		const div = direction / 22.5;
		if (div % 2 === 0)
			return detailed_rotation_directions[Math.trunc(div)];
		else
			return detailed_rotation_directions[Math.trunc((div - div % 2) + 1)];
	} else
		return rotation_directions[Math.trunc(direction / 45)];
}

export function get_1d_distance(x1, x2) {
	return Math.abs(x1 - x2);
}

export function get_2d_distance(x1, y1, x2, y2) {
	const x = get_1d_distance(x1, x2);
	const y = get_1d_distance(y1, y2);
	return Math.sqrt(Math.pow(x, 2.0) + Math.pow(y, 2.0));
}

// get_3d_distance(x1, y1, z1, x2, y2, z2)
// get_3d_distance(c1, c2)
export function get_3d_distance(...args) {
	if (args.length === 2) {
		const [c1, c2] = args;
		return get_3d_distance(c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
	}
	const [x1, y1, z1, x2, y2, z2] = args;
	const x = get_1d_distance(x1, x2);
	const y = get_1d_distance(y1, y2);
	const z = get_1d_distance(z1, z2);
	return Math.sqrt(Math.pow(x, 2.0) + Math.pow(y, 2.0) + Math.pow(z, 2.0));
}

export function get_clamped_3d_distance(current, min, max) {
	const dx = (current.x < min.x) ? (min.x - current.x) : (current.x > max.x) ? (current.x - max.x) : 0;
	const dy = (current.y < min.y) ? (min.y - current.y) : (current.y > max.y) ? (current.y - max.y) : 0;
	const dz = (current.z < min.z) ? (min.z - current.z) : (current.z > max.z) ? (current.z - max.z) : 0;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// get_3d_distance_circle(x1, y1, z1, x2, y2, z2)
// get_3d_distance_circle(c1, c2)
export function get_3d_distance_circle(...args) {
	if (args.length === 2) {
		const [c1, c2] = args;
		return get_3d_distance(c1.x, c1.y, c1.z, c2.x, c2.y, c2.z);
	}
	const [x1, y1, z1, x2, y2, z2] = args;
	const x = get_1d_distance(x1, x2);
	const y = get_1d_distance(y1, y2);
	const z = get_1d_distance(z1, z2);
	return x + y + z;
}

export function calculate_x_y_angle(x1, y1, x2, y2, deg, at_least_1_tile = true, floor_deg = true) {
	if (at_least_1_tile && get_2d_distance(x1, y1, x2, y2) < 1) return 0;
	const x = x2 - x1;
	const y = y2 - y1;
	if (x === 0 && y === 0)
		return 0;
	const rad = Math.atan2(x, y);
	let fdeg = rad * (180.0 / pi);
	fdeg -= deg;
	while (fdeg < 0)
		fdeg += 360;
	if (floor_deg)
		fdeg = Math.floor(fdeg);
	return fdeg;
}

export function calculate_clamped_x_y_angle(current, min, max, deg, at_least_1_tile = true, floor_deg = true) {
	const clamped_x = Math.min(Math.max(current.x, min.x), max.x);
	const clamped_y = Math.min(Math.max(current.y, min.y), max.y);
	if (at_least_1_tile && get_2d_distance(current.x, current.y, clamped_x, clamped_y) < 1)
		return 0;
	const x = clamped_x - current.x;
	const y = clamped_y - current.y;
	if (x === 0 && y === 0)
		return 0;
	const rad = Math.atan2(x, y);
	let fdeg = rad * (180.0 / pi);
	fdeg -= deg;
	while (fdeg < 0)
		fdeg += 360;
	if (floor_deg)
		fdeg = Math.floor(fdeg);
	return fdeg;
}

export function calculate_x_y_string(deg) {
	if (deg === 0 || deg === 360)
		return "straight in front";
	else if (deg > 0 && deg < 10)
		return "in front and very slightly to the right";
	else if (deg > 9 && deg < 20)
		return "in front and slightly off to the right";
	else if (deg > 19 && deg < 40)
		return "in front a little ways off to the right";
	else if (deg > 39 && deg < 90)
		return "slightly in front and a fair distance off to the right";
	else if (deg === 90)
		return "straight off to the right";
	else if (deg > 90 && deg < 120)
		return "slightly behind and far off to the right";
	else if (deg > 119 && deg < 150)
		return "behind and a little ways off to the right";
	else if (deg > 149 && deg < 170)
		return "behind and slightly to the right";
	else if (deg > 169 && deg < 180)
		return "behind and very slightly to the right";
	else if (deg === 180)
		return "straight behind";
	else if (deg > 180 && deg < 190)
		return "behind and very slightly to the left";
	else if (deg > 189 && deg < 200)
		return "behind and slightly to the left";
	else if (deg > 199 && deg < 220)
		return "behind and a little ways off to the left";
	else if (deg > 219 && deg < 240)
		return "behind and a fair distance off to the left";
	else if (deg > 239 && deg < 270)
		return "slightly behind and far off to the left";
	else if (deg === 270)
		return "straight off to the left";
	else if (deg > 270 && deg < 300)
		return "slightly in front far off to the left";
	else if (deg > 299 && deg < 320)
		return "in front and a ways off to the left";
	else if (deg > 319 && deg < 340)
		return "in front and a little ways off to the left";
	else if (deg > 339 && deg < 350)
		return "in front and slightly off to the left";
	else if (deg > 349 && deg < 360)
		return "in front and very slightly off to the left";
	return "";
}

export function calculate_x_y_string3d(deg, z1, z2) {
	if (z1 > z2)
		return "below, " + calculate_x_y_string(deg);
	else if (z1 < z2)
		return "above, " + calculate_x_y_string(deg);
	else
		return calculate_x_y_string(deg);
}
