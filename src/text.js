const UNITS = [
	{ name: 'week', ms: 604800000 },
	{ name: 'day', ms: 86400000 },
	{ name: 'hour', ms: 3600000 },
	{ name: 'minute', ms: 60000 },
	{ name: 'second', ms: 1000 },
];

export function prettySequence(list, last = null) {
	const parts = Array.from(list, item => String(item));
	if (parts.length === 0) return '';
	if (parts.length === 1) return parts[0];
	const end = parts.pop();
	return `${parts.join(', ')}${last ? ` ${last} ` : ', '}${end}`;
}

export function formatTime(ms, pretty = true) {
	let remaining = Math.floor(Math.abs(ms));
	const parts = [];
	for (const unit of UNITS) {
		const count = Math.floor(remaining / unit.ms);
		remaining -= count * unit.ms;
		if (count > 0) parts.push(`${count} ${unit.name}${count === 1 ? '' : 's'}`);
	}
	if (parts.length === 0) return 'no time at all';
	return pretty ? prettySequence(parts, 'and') : parts.join(' ');
}

const SCALES = [
	'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion',
	'sextillion', 'septillion', 'octillion', 'nonillion', 'decillion', 'undecillion',
	'duodecillion', 'tredecillion', 'quattuordecillion', 'quindecillion', 'sexdecillion',
	'septendecillion', 'octodecillion', 'novemdecillion', 'vigintillion',
];

// Names the scale of a large number instead of reading every digit. Rounding can
// push a value up a scale, such as 999999 becoming a million, so the result is
// checked once more afterward.
export function prettyNumber(number, decimals = 2) {
	let value = number;
	let index = 0;
	while (Math.abs(value) >= 1000 && index < SCALES.length) {
		value /= 1000;
		index++;
	}
	let rounded = Number(value.toFixed(index === 0 ? 0 : decimals));
	if (Math.abs(rounded) >= 1000 && index < SCALES.length) {
		rounded = Number((rounded / 1000).toFixed(decimals));
		index++;
	}
	if (index === 0) return String(rounded);
	return `${rounded} ${SCALES[index - 1]}`;
}

// Optimal string alignment distance: the edit count to turn one string into
// another, counting an adjacent swap as a single typo. Splitting by code point
// keeps accented letters and emoji from counting twice.
export function stringDistance(a, b) {
	const from = Array.from(a);
	const to = Array.from(b);
	if (from.length === 0) return to.length;
	if (to.length === 0) return from.length;
	let twoBack = null;
	let previous = Array.from({ length: to.length + 1 }, (_, j) => j);
	let current = new Array(to.length + 1);
	for (let i = 1; i <= from.length; i++) {
		current[0] = i;
		for (let j = 1; j <= to.length; j++) {
			const cost = from[i - 1] === to[j - 1] ? 0 : 1;
			current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
			if (i > 1 && j > 1 && from[i - 1] === to[j - 2] && from[i - 2] === to[j - 1]) {
				current[j] = Math.min(current[j], twoBack[j - 2] + cost);
			}
		}
		twoBack = previous;
		previous = current;
		current = new Array(to.length + 1);
	}
	return previous[to.length];
}

// Picks the candidate a typed word most likely meant, so a mistyped command or
// menu entry can still reach its target. Ties go to the earlier candidate.
export function closestMatch(input, candidates, maxDistance = Infinity) {
	const needle = String(input).toLowerCase();
	let best = null;
	let bestDistance = Infinity;
	for (const candidate of candidates) {
		const distance = stringDistance(needle, String(candidate).toLowerCase());
		if (distance < bestDistance) {
			best = candidate;
			bestDistance = distance;
		}
	}
	if (best === null || bestDistance > maxDistance) return null;
	return { match: best, distance: bestDistance };
}
