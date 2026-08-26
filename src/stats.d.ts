/**
 * Stat tracking, formatted output, sorting, sets, and serialization.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/stats.md | stats guide}.
 *
 * @module
 */
/** Supported stat name ordering modes. */
export type StatSortMode = 'none' | 'add_order' | 'value' | 0 | 1 | 2;

/** Named constants for stat ordering modes. */
export const STAT_SORT_MODE: {
	/** Preserves the map's current iteration order. */
	readonly NONE: 'none';
	/** Orders names by the sequence in which their stats were added. */
	readonly ADD_ORDER: 'add_order';
	/** Orders names by their stat values. */
	readonly VALUE: 'value';
};

/** Formats a stat for display. */
export type StatCallback = (stat: Stat) => string;

/** A named value with display formatting and application metadata. */
export class Stat {
	/** Case sensitive stat name. */
	name: string;
	/** Current stat value. */
	val: any;
	/** Display template whose first `%0` is replaced by the value. */
	text: string;
	/** Function used by {@link Stat.format}. */
	callback: StatCallback;
	/** Application specific metadata retained with the stat. */
	user: Record<string, any>;
	/** Internal insertion sequence used by add order sorting. */
	sortCounter: number;

	/** Creates a stat with an optional template, formatter, and metadata. */
	constructor(name: string, val: any, text?: string, callback?: StatCallback | null, user?: Record<string, any> | null);
	/** Formats the stat through its callback. */
	format(): string;
	/** Returns the formatted stat text. */
	toString(): string;
	/** Returns the underlying stat value for primitive coercion. */
	valueOf(): any;
}

/** A mutable collection of named stats. */
export class StatSet {
	/** Stats stored by their case sensitive names. */
	stats: Map<string, Stat>;
	/** Number of stats in the set. */
	readonly size: number;

	/** Creates an empty set or copies an accepted stat collection. */
	constructor(other?: StatSet | Stat[] | Record<string, any> | null);
	/** Returns {@link StatSet.size}. */
	get_size(): number;
	/** Adds a new stat, or returns `null` when its name already exists. */
	add(name: string, val: any, text?: string, callback?: StatCallback | null, user?: Record<string, any> | null): Stat | null;
	/** Replaces an existing stat value and ignores missing names. */
	update(name: string, val: any): void;
	/** Adds a delta to an existing stat value and ignores missing names. */
	mod(name: string, delta: number): void;
	/** Removes a stat and returns whether it existed. */
	delete(name: string): boolean;
	/** Alias for {@link StatSet.delete}. */
	remove(name: string): boolean;
	/** Removes every stat from the set. */
	reset(): void;
	/** Alias for {@link StatSet.reset}. */
	clear(): void;
	/** Returns a stat by name, or `null` when absent. */
	get(name: string): Stat | null;
	/** Returns whether a stat name exists. */
	exists(name: string): boolean;
	/** Alias for {@link StatSet.exists}. */
	has(name: string): boolean;
	/** Returns every stat in map iteration order. */
	getStats(): Stat[];
	/** Alias for {@link StatSet.getStats}. */
	get_stats(): Stat[];
	/** Returns stat names ordered by the selected mode and priority lists. */
	list(sortMode?: StatSortMode, sortInFront?: string[], sortBehind?: string[]): string[];
	/** Merges accepted stats into this set and returns this set. */
	addSet(other: StatSet | Stat[] | Record<string, any>): this;
	/** Serializes stats as newline separated `name=value` pairs. */
	serializeLinear(): string;
	/** Alias for {@link StatSet.serializeLinear}. */
	serialize_linear(): string;
	/** Loads valid `name=value` lines and returns whether any pair was found. */
	deserializeLinear(data: string): boolean;
	/** Alias for {@link StatSet.deserializeLinear}. */
	deserialize_linear(data: string): boolean;
	/** Serializes stat names, values, and templates as JSON. */
	serialize(): string;
	/** Loads stats from a JSON string or parsed array and reports success. */
	deserialize(data: string | any[]): boolean;
}

/** Applies a stat's display template to its current value. */
export function defaultStatCallback(stat: Stat): string;
/** Creates an empty stat set or copies an accepted stat collection. */
export function createStatSet(other?: StatSet | Stat[] | Record<string, any> | null): StatSet;
