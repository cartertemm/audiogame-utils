/**
 * Loading, querying, editing, and serializing spatial game maps.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/map.md | map guide}.
 *
 * @module
 */
/** Map metadata and inclusive maximum coordinates. */
export interface MapHeader {
	/** Map display name. Optional before a map is loaded. */
	name?: string;
	/** Highest valid X coordinate. */
	maxx: number;
	/** Highest valid Y coordinate. */
	maxy: number;
	/** Highest valid Z coordinate. */
	maxz: number;
}

/** An axis aligned map object with registered payload fields. */
export interface MapEntry {
	/** Registered entry type. */
	type: string;
	/** Inclusive minimum X coordinate. */
	minx: number;
	/** Inclusive maximum X coordinate. */
	maxx: number;
	/** Inclusive minimum Y coordinate. */
	miny: number;
	/** Inclusive maximum Y coordinate. */
	maxy: number;
	/** Inclusive minimum Z coordinate. */
	minz: number;
	/** Inclusive maximum Z coordinate. */
	maxz: number;
	/** Payload field registered for this entry type. */
	[key: string]: any;
}

/** Serializable map header and entries. */
export interface SerializedMap extends MapHeader {
	/** Entries in insertion order. */
	entries: MapEntry[];
}

/** Fields and overlap policy for a custom map entry type. */
export interface TypeDefinition {
	/** Whether entries of this type may overlap. Defaults to `allow`. */
	overlap?: 'allow' | 'error';
	/** Required payload fields stored for the type. Defaults to an empty list. */
	fields?: string[];
}

/** Parsed map data or its JSON representation. */
export type MapSource = string | SerializedMap;

/** Exactly one source used to load a map batch. */
export interface LoadMapSource {
	/** URL fetched as text and passed to the configured parser. */
	url?: string;
	/** Parsed map data or source text. */
	data?: MapSource;
	/** Function that returns map data directly or through a promise. */
	from?: () => Promise<MapSource> | MapSource;
}

/** Configuration for {@link createMap}. */
export interface MapOptions {
	/** Converts source text or data into a serialized map. Defaults to the JSON parser. */
	parser?: (raw: MapSource) => SerializedMap;
}

/** A mutable collection of typed spatial entries. */
export interface MapInstance {
	/** Validates and transactionally appends one map batch. */
	loadMap(source: LoadMapSource): Promise<void>;
	/** Returns entries of one type that overlap an inclusive query box. */
	getDataAt(type: string, minx: number, maxx: number, miny: number, maxy: number, minz: number, maxz: number): MapEntry[];
	/** Returns the last matching entry at a point, or `undefined`. */
	getOneAt(type: string, x: number, y: number, z: number): MapEntry | undefined;
	/** Validates and adds one entry, returning its insertion index. */
	setDataAt(entry: MapEntry): number;
	/** Removes entries of one type that overlap an inclusive query box. */
	removeDataAt(type: string, minx: number, maxx: number, miny: number, maxy: number, minz: number, maxz: number): void;
	/** Registers a custom entry type for this map instance. */
	registerType(name: string, def?: TypeDefinition): void;
	/** Returns the current header and live entries as plain data. */
	serialize(): SerializedMap;
	/** Removes entries and resets the header while retaining type registrations. */
	clear(): void;
	/** Returns a copy of the current header, or `null` before a successful load. */
	header(): MapHeader | null;
	/** Approximates bytes used by fixed bounds storage since the latest clear. */
	memoryBytes(): number;
}

/** Creates an empty spatial map with built in tile, source, and zone types. */
export function createMap(options?: MapOptions): MapInstance;
