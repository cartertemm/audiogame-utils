/**
 * Spatial indexing and physics helpers.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils/blob/main/docs/physics.md | physics guide}.
 *
 * @module
 */
/** An immutable two dimensional R tree over packed integer bounds. */
export interface RTree {
	/** Returns indexes whose bounds overlap the inclusive query rectangle. */
	search(minx: number, maxx: number, miny: number, maxy: number): number[];
}

/**
 * Builds an immutable R tree over `count` packed `[minx, maxx, miny, maxy]` records.
 *
 * @throws {Error} When `node_size` is less than `2`.
 */
export function createRTree(bounds: Int32Array, count: number, node_size?: number): RTree;
