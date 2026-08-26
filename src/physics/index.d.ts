export interface RTree {
	search(minx: number, maxx: number, miny: number, maxy: number): number[];
}

export function createRTree(bounds: Int32Array, count: number, node_size?: number): RTree;
