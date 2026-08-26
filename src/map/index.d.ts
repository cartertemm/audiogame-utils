export interface MapHeader {
	name?: string;
	maxx: number;
	maxy: number;
	maxz: number;
}

export interface MapEntry {
	type: string;
	minx: number;
	maxx: number;
	miny: number;
	maxy: number;
	minz: number;
	maxz: number;
	[key: string]: any;
}

export interface SerializedMap extends MapHeader {
	entries: MapEntry[];
}

export interface TypeDefinition {
	overlap?: 'allow' | 'error';
	fields?: string[];
}

export type MapSource = string | SerializedMap;

export interface LoadMapSource {
	url?: string;
	data?: MapSource;
	from?: () => Promise<MapSource> | MapSource;
}

export interface MapOptions {
	parser?: (raw: MapSource) => SerializedMap;
}

export interface MapInstance {
	loadMap(source: LoadMapSource): Promise<void>;
	getDataAt(type: string, minx: number, maxx: number, miny: number, maxy: number, minz: number, maxz: number): MapEntry[];
	getOneAt(type: string, x: number, y: number, z: number): MapEntry | undefined;
	setDataAt(entry: MapEntry): number;
	removeDataAt(type: string, minx: number, maxx: number, miny: number, maxy: number, minz: number, maxz: number): void;
	registerType(name: string, def?: TypeDefinition): void;
	serialize(): SerializedMap;
	clear(): void;
	header(): MapHeader | null;
	memoryBytes(): number;
}

export function createMap(options?: MapOptions): MapInstance;
