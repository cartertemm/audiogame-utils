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

// Implementation of the sfc32 (Small Fast Counter) algorithm.
// Creates a basic generator with a 128 bit state that is fast enough to call every frame and passes the usual randomness test suites.
function sfc32(a, b, c, d) {
	return function () {
		const t = (((a + b) | 0) + d) | 0;
		d = (d + 1) | 0;
		a = b ^ (b >>> 9);
		b = (c + (c << 3)) | 0;
		c = (c << 21) | (c >>> 11);
		c = (c + t) | 0;
		return (t >>> 0) / 4294967296;
	};
}

// Performs a xmur3 string hash. We store the seed this way to keep neighboring seeds such as 1 and 2 from producing correlated streams.
function seed_words(seed) {
	const text = String(seed);
	let h = 1779033703 ^ text.length;
	for (let i = 0; i < text.length; i++) {
		h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
		h = (h << 13) | (h >>> 19);
	}
	const words = [];
	for (let i = 0; i < 4; i++) {
		h = Math.imul(h ^ (h >>> 16), 2246822507);
		h = Math.imul(h ^ (h >>> 13), 3266489909);
		h ^= h >>> 16;
		words.push(h >>> 0);
	}
	return words;
}

function make_random(next) {
	return {
		next,
		int(min, max) {
			return min + Math.floor(next() * (max - min + 1));
		},
		float(min = 0, max = 1) {
			return min + next() * (max - min);
		},
		choice(list) {
			if (list.length === 0) return undefined;
			return list[Math.floor(next() * list.length)];
		},
		weighted_choice(list, weights) {
			let total = 0;
			for (const weight of weights) total += weight;
			if (total <= 0) return undefined;
			let roll = next() * total;
			for (let i = 0; i < list.length; i++) {
				roll -= weights[i];
				if (roll < 0) return list[i];
			}
			return list[list.length - 1];
		},
		shuffle(list) {
			const result = [...list];
			for (let i = result.length - 1; i > 0; i--) {
				const j = Math.floor(next() * (i + 1));
				[result[i], result[j]] = [result[j], result[i]];
			}
			return result;
		},
	};
}

const unseeded = make_random(() => Math.random());

export function random_generator(seed = Math.floor(Math.random() * 4294967296)) {
	const [a, b, c, d] = seed_words(seed);
	const next = sfc32(a, b, c, d);
	// Discard the first few values so a weak seed cannot show through.
	for (let i = 0; i < 12; i++) next();
	return { seed, ...make_random(next) };
}

export function random_int(min, max) {
	return unseeded.int(min, max);
}

export function random_float(min = 0, max = 1) {
	return unseeded.float(min, max);
}

export function random_choice(list) {
	return unseeded.choice(list);
}

export function weighted_choice(list, weights) {
	return unseeded.weighted_choice(list, weights);
}

export function shuffle(list) {
	return unseeded.shuffle(list);
}
