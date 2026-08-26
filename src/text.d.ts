export interface ClosestMatch<T = string> {
	match: T;
	distance: number;
}

// Joins a list for speech, such as "red, green and blue". `last` is the word
// placed before the final item. Without it the items are only comma separated.
export function prettySequence(list: Iterable<unknown>, last?: string | null): string;
export function pluralize(count: number | bigint, singular: string, plural?: string): string;
// Spells a duration in milliseconds, such as "2 minutes and 3 seconds".
// `pretty` false joins the parts with spaces instead.
export function formatTime(ms: number, pretty?: boolean): string;
// Spells a large number with a scale name, such as "1.5 million".
export function prettyNumber(number: number | bigint, decimals?: number): string;
// Optimal string alignment distance, counting an adjacent swap as one typo.
export function stringDistance(a: string, b: string): number;
// Null when nothing is within `maxDistance`.
export function closestMatch<T = string>(input: unknown, candidates: Iterable<T>, maxDistance?: number): ClosestMatch<T> | null;
