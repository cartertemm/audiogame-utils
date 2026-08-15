import { createRTree } from '../physics/rtree.js';

const STRIDE = 6;
const INITIAL_ROWS = 1024;
const MIN_OVERLAY = 64;
const OVERLAY_RATIO = 0.05;

export function createStore(types) {
	let bounds = new Int32Array(INITIAL_ROWS * STRIDE);
	let removed_rows = new Uint8Array(INITIAL_ROWS);
	let row_type = new Int32Array(INITIAL_ROWS);
	let row_slot = new Int32Array(INITIAL_ROWS);
	let count = 0;

	// One shared value table. Payload slots hold indices into it, so 200k
	// entries carrying tile "concrete.ogg" cost one string and 200k ints.
	let values = [];
	let value_ids = new Map();
	let buckets = new Map();

	function intern(value) {
		let id = value_ids.get(value);
		if (id === undefined) {
			id = values.length;
			values.push(value);
			value_ids.set(value, id);
		}
		return id;
	}

	function grow_int32(array, needed) {
		if (needed <= array.length) return array;
		let size = array.length || 1;
		while (size < needed) size *= 2;
		const next = new Int32Array(size);
		next.set(array);
		return next;
	}

	function ensure_rows(id) {
		if (id < removed_rows.length) return;
		let size = removed_rows.length;
		while (size <= id) size *= 2;
		const next_bounds = new Int32Array(size * STRIDE);
		next_bounds.set(bounds);
		bounds = next_bounds;
		const next_removed = new Uint8Array(size);
		next_removed.set(removed_rows);
		removed_rows = next_removed;
		row_type = grow_int32(row_type, size);
		row_slot = grow_int32(row_slot, size);
	}

	function bucket_for(type) {
		let bucket = buckets.get(type);
		if (!bucket) {
			bucket = {
				type,
				ids: [],
				payload: new Int32Array(0),
				payload_count: 0,
				tree: null,
				tree_ids: null,
				overlay: [],
				built: false,
			};
			buckets.set(type, bucket);
		}
		return bucket;
	}

	function add(entry) {
		const def = types.get(entry.type);
		const id = count++;
		ensure_rows(id);
		const row = id * STRIDE;
		bounds[row] = entry.minx;
		bounds[row + 1] = entry.maxx;
		bounds[row + 2] = entry.miny;
		bounds[row + 3] = entry.maxy;
		bounds[row + 4] = entry.minz;
		bounds[row + 5] = entry.maxz;
		removed_rows[id] = 0;
		row_type[id] = intern(entry.type);

		const bucket = bucket_for(entry.type);
		const width = def.fields.length;
		const slot = bucket.payload_count++;
		row_slot[id] = slot;
		if (width > 0) {
			bucket.payload = grow_int32(bucket.payload, (slot + 1) * width);
			for (let i = 0; i < width; i++) {
				bucket.payload[slot * width + i] = intern(entry[def.fields[i]]);
			}
		}
		bucket.ids.push(id);

		if (bucket.built) {
			bucket.overlay.push(id);
			if (bucket.overlay.length > Math.max(MIN_OVERLAY, bucket.ids.length * OVERLAY_RATIO)) {
				bucket.built = false;
			}
		}
		return id;
	}

	function build(bucket) {
		const live = [];
		for (const id of bucket.ids) {
			if (!removed_rows[id]) live.push(id);
		}
		const xy = new Int32Array(live.length * 4);
		for (let i = 0; i < live.length; i++) {
			const row = live[i] * STRIDE;
			xy[i * 4] = bounds[row];
			xy[i * 4 + 1] = bounds[row + 1];
			xy[i * 4 + 2] = bounds[row + 2];
			xy[i * 4 + 3] = bounds[row + 3];
		}
		bucket.tree = createRTree(xy, live.length);
		bucket.tree_ids = live;
		bucket.overlay = [];
		bucket.built = true;
	}

	function query(type, minx, maxx, miny, maxy, minz, maxz) {
		const bucket = buckets.get(type);
		if (!bucket) return [];
		if (!bucket.built) build(bucket);

		const hits = [];
		for (const row of bucket.tree.search(minx, maxx, miny, maxy)) hits.push(bucket.tree_ids[row]);
		for (const id of bucket.overlay) {
			const row = id * STRIDE;
			if (maxx < bounds[row] || minx > bounds[row + 1]) continue;
			if (maxy < bounds[row + 2] || miny > bounds[row + 3]) continue;
			hits.push(id);
		}

		const out = [];
		for (const id of hits) {
			if (removed_rows[id]) continue;
			const row = id * STRIDE;
			if (maxz < bounds[row + 4] || minz > bounds[row + 5]) continue;
			out.push(id);
		}
		out.sort((a, b) => a - b);
		return out;
	}

	function read(id) {
		const type = values[row_type[id]];
		const def = types.get(type);
		const row = id * STRIDE;
		const entry = {
			type,
			minx: bounds[row],
			maxx: bounds[row + 1],
			miny: bounds[row + 2],
			maxy: bounds[row + 3],
			minz: bounds[row + 4],
			maxz: bounds[row + 5],
		};
		const bucket = buckets.get(type);
		const width = def.fields.length;
		const slot = row_slot[id];
		for (let i = 0; i < width; i++) {
			entry[def.fields[i]] = values[bucket.payload[slot * width + i]];
		}
		return entry;
	}

	function remove(ids) {
		for (const id of ids) removed_rows[id] = 1;
	}

	// Overlap is checked once after a bulk load rather than per insert, because
	// per insert would force an index build for every entry. When ids is given,
	// only those rows are walked (entries a previous, already-checked load added
	// are skipped); each is still searched against the whole bucket, so it is
	// still compared against every pre-existing entry, just not re-iterated.
	function assertNoOverlap(type, ids) {
		const bucket = buckets.get(type);
		if (!bucket) return;
		for (const id of ids ?? bucket.ids) {
			if (removed_rows[id]) continue;
			const row = id * STRIDE;
			const hits = query(
				type,
				bounds[row], bounds[row + 1],
				bounds[row + 2], bounds[row + 3],
				bounds[row + 4], bounds[row + 5],
			);
			for (const other of hits) {
				if (other === id) continue;
				throw overlap_error(type, id, other);
			}
		}
	}

	function overlap_error(type, id, other) {
		const a = read(id);
		const b = read(other);
		return new Error(
			`map: type "${type}" does not allow overlap, but ` +
			`[${a.minx},${a.maxx}]x[${a.miny},${a.maxy}]x[${a.minz},${a.maxz}] and ` +
			`[${b.minx},${b.maxx}]x[${b.miny},${b.maxy}]x[${b.minz},${b.maxz}] share a cell. ` +
			'Bounds are inclusive, so [0,10] and [10,20] touch at 10.',
		);
	}

	function liveIds() {
		const out = [];
		for (const bucket of buckets.values()) {
			for (const id of bucket.ids) {
				if (!removed_rows[id]) out.push(id);
			}
		}
		out.sort((a, b) => a - b);
		return out;
	}

	function clear() {
		bounds = new Int32Array(INITIAL_ROWS * STRIDE);
		removed_rows = new Uint8Array(INITIAL_ROWS);
		row_type = new Int32Array(INITIAL_ROWS);
		row_slot = new Int32Array(INITIAL_ROWS);
		count = 0;
		values = [];
		value_ids = new Map();
		buckets = new Map();
	}

	return {
		add,
		query,
		read,
		remove,
		assertNoOverlap,
		liveIds,
		clear,
		size: () => liveIds().length,
		rowCount: () => count,
		valueCount: () => values.length,
		boundsBytes: () => count * STRIDE * 4,
	};
}
