// @ts-self-types="./math.d.ts"
export function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

export function lerp(a, b, t) {
	return a + (b - a) * t;
}

export function inverse_lerp(a, b, value) {
	if (a === b) return 0;
	return (value - a) / (b - a);
}

export function range_convert(value, in_min, in_max, out_min, out_max) {
	return lerp(out_min, out_max, inverse_lerp(in_min, in_max, value));
}

// Signed shortest turn from one heading to another, in degrees. Positive turns
// right, negative turns left, and a straight reversal reads as 180.
export function angle_difference(from, to) {
	return 180 - wrap(from - to + 180, 0, 360);
}

// Half open: min is included, max is not, so wrap(360, 0, 360) is 0.
export function wrap(value, min, max) {
	const span = max - min;
	if (span === 0) return min;
	return min + ((((value - min) % span) + span) % span);
}

export function random_int(min, max) {
	return min + Math.floor(Math.random() * (max - min + 1));
}

export function random_float(min = 0, max = 1) {
	return min + Math.random() * (max - min);
}

export function random_choice(list) {
	if (list.length === 0) return undefined;
	return list[Math.floor(Math.random() * list.length)];
}

export function weighted_choice(list, weights) {
	let total = 0;
	for (const weight of weights) total += weight;
	if (total <= 0) return undefined;
	let roll = Math.random() * total;
	for (let i = 0; i < list.length; i++) {
		roll -= weights[i];
		if (roll < 0) return list[i];
	}
	return list[list.length - 1];
}

export function shuffle(list) {
	const result = [...list];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}
