/**
 * Sequence, time, number, pluralization, and string matching helpers.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/text.md | text guide}.
 *
 * @module
 */
/** A candidate selected by {@link closestMatch} and its edit distance. */
export interface ClosestMatch<T = string> {
	/** Original candidate value. */
	match: T;
	/** Levenshtein distance from the normalized input. */
	distance: number;
}

/** Joins an iterable into a readable sequence with a configurable final separator. */
export function prettySequence(list: Iterable<unknown>, last?: string | null): string;
/** Chooses a singular or plural label for a numeric count. */
export function pluralize(count: number | bigint, singular: string, plural?: string): string;
/** Formats milliseconds as readable units or a colon separated clock value. */
export function formatTime(ms: number, pretty?: boolean): string;
/** Formats a number with grouping and optional decimal precision. */
export function prettyNumber(number: number | bigint, decimals?: number): string;
/** Returns the case sensitive Levenshtein distance between two strings. */
export function stringDistance(a: string, b: string): number;
/** Returns the nearest stringified candidate within `maxDistance`, or `null`. */
export function closestMatch<T = string>(input: unknown, candidates: Iterable<T>, maxDistance?: number): ClosestMatch<T> | null;
