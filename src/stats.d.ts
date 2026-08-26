export type StatSortMode = 'none' | 'add_order' | 'value' | 0 | 1 | 2;

export const STAT_SORT_MODE: {
	readonly NONE: 'none';
	readonly ADD_ORDER: 'add_order';
	readonly VALUE: 'value';
};

export type StatCallback = (stat: Stat) => string;

export class Stat {
	name: string;
	val: any;
	text: string;
	callback: StatCallback;
	user: Record<string, any>;
	sortCounter: number;

	constructor(name: string, val: any, text?: string, callback?: StatCallback | null, user?: Record<string, any> | null);
	format(): string;
	toString(): string;
	valueOf(): any;
}

export class StatSet {
	stats: Map<string, Stat>;
	readonly size: number;

	constructor(other?: StatSet | Stat[] | Record<string, any> | null);
	get_size(): number;
	add(name: string, val: any, text?: string, callback?: StatCallback | null, user?: Record<string, any> | null): Stat | null;
	update(name: string, val: any): void;
	mod(name: string, delta: number): void;
	delete(name: string): boolean;
	remove(name: string): boolean;
	reset(): void;
	clear(): void;
	get(name: string): Stat | null;
	exists(name: string): boolean;
	has(name: string): boolean;
	getStats(): Stat[];
	get_stats(): Stat[];
	list(sortMode?: StatSortMode, sortInFront?: string[], sortBehind?: string[]): string[];
	addSet(other: StatSet | Stat[] | Record<string, any>): this;
	serializeLinear(): string;
	serialize_linear(): string;
	deserializeLinear(data: string): boolean;
	deserialize_linear(data: string): boolean;
	serialize(): string;
	deserialize(data: string | any[]): boolean;
}

export function defaultStatCallback(stat: Stat): string;
export function createStatSet(other?: StatSet | Stat[] | Record<string, any> | null): StatSet;
