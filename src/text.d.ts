export interface ClosestMatch<T = string> {
	match: T;
	distance: number;
}

export function prettySequence(list: Iterable<unknown>, last?: string | null): string;
export function pluralize(count: number | bigint, singular: string, plural?: string): string;
export function formatTime(ms: number, pretty?: boolean): string;
export function prettyNumber(number: number | bigint, decimals?: number): string;
export function stringDistance(a: string, b: string): number;
export function closestMatch<T = string>(input: unknown, candidates: Iterable<T>, maxDistance?: number): ClosestMatch<T> | null;
