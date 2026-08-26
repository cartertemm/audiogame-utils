// @ts-self-types="./index.d.ts"
import { createTypes } from './types.js';
import { createStore } from './store.js';
import { parseJSON, serializeJSON } from './format.js';

export function createMap(options = {}) {
	const parse = options.parser ?? parseJSON;
	const types = createTypes();
	const store = createStore(types);
	let header = null;

	async function loadMap(source = {}) {
		const given = ['url', 'data', 'from'].filter((key) => source[key] !== undefined);
		if (given.length !== 1) {
			throw new Error(`map: loadMap needs exactly one of url, data, or from, got ${given.length}`);
		}
		let raw;
		if (source.url !== undefined) raw = await fetch_text(source.url);
		else if (source.data !== undefined) raw = source.data;
		else raw = await source.from();
		ingest(parse(raw));
	}

	async function fetch_text(url) {
		let response;
		try {
			response = await fetch(url);
		} catch (cause) {
			throw new Error(`map: could not fetch ${url}`, { cause });
		}
		if (!response.ok) throw new Error(`map: could not fetch ${url}, server said ${response.status}`);
		return response.text();
	}

	// Validate the whole batch (fields, bounds) before touching the store, then add
	// entries and run the overlap pass. If the overlap pass throws, the entries just
	// added are the only ones at risk, so roll those back by id rather than redoing
	// validation. The header is only committed once every step above has succeeded,
	// so a failed load leaves both the store and the header exactly as they were.
	function ingest(parsed) {
		assert_entries_shape(parsed.entries);

		const next_header = header === null
			? { name: parsed.name, maxx: parsed.maxx, maxy: parsed.maxy, maxz: parsed.maxz }
			: {
				name: header.name,
				maxx: Math.max(header.maxx, parsed.maxx),
				maxy: Math.max(header.maxy, parsed.maxy),
				maxz: Math.max(header.maxz, parsed.maxz),
			};

		parsed.entries.forEach((entry, index) => {
			types.validate(entry, index);
			assert_in_bounds(entry, index, next_header);
		});

		const added = [];
		try {
			const added_by_type = new Map();
			parsed.entries.forEach((entry) => {
				const id = store.add(entry);
				added.push(id);
				if (!added_by_type.has(entry.type)) added_by_type.set(entry.type, []);
				added_by_type.get(entry.type).push(id);
			});
			for (const [type, ids] of added_by_type) {
				// Only the ids this load just added need checking: earlier loads already
				// proved their own entries non-overlapping, and query() below still
				// searches the whole bucket, so each new id is still compared against
				// every pre-existing entry, not only against this batch.
				if (types.get(type).overlap === 'error') store.assertNoOverlap(type, ids);
			}
		} catch (err) {
			store.remove(added);
			throw err;
		}

		header = next_header;
	}

	// Runs against whatever the parser (default or a caller-supplied
	// options.parser) returned, so a custom parser cannot bypass the shape
	// checks by skipping format.js.
	function assert_entries_shape(entries) {
		if (!Array.isArray(entries)) {
			throw new Error(`map: file's "entries" must be an array, got ${JSON.stringify(entries)}`);
		}
		entries.forEach((entry, index) => {
			if (entry === null || typeof entry !== 'object') {
				throw new Error(`map: entry ${index} must be an object, got ${JSON.stringify(entry)}`);
			}
		});
	}

	function assert_in_bounds(entry, index, ref_header) {
		if (ref_header === null) return;
		const outside = entry.minx < 0 || entry.maxx > ref_header.maxx
			|| entry.miny < 0 || entry.maxy > ref_header.maxy
			|| entry.minz < 0 || entry.maxz > ref_header.maxz;
		if (outside) {
			throw new Error(
				`map: entry ${index} sits outside the map, which is ` +
				`${ref_header.maxx} by ${ref_header.maxy} by ${ref_header.maxz}`,
			);
		}
	}

	function getDataAt(type, minx, maxx, miny, maxy, minz, maxz) {
		types.get(type);
		return store.query(type, minx, maxx, miny, maxy, minz, maxz).map(store.read);
	}

	function getOneAt(type, x, y, z) {
		types.get(type);
		const ids = store.query(type, x, x, y, y, z, z);
		return ids.length === 0 ? undefined : store.read(ids[ids.length - 1]);
	}

	function setDataAt(entry) {
		// The error-message label just needs to identify which entry a message is
		// about. store.size() computes that by walking and sorting every live id,
		// which is O(n log n) per call. store.rowCount() is the store's existing
		// monotonic row counter, so it is O(1) and still names a specific row.
		const label = store.rowCount();
		types.validate(entry, label);
		assert_in_bounds(entry, label, header);
		if (types.get(entry.type).overlap === 'error') {
			const clash = store.query(
				entry.type,
				entry.minx, entry.maxx,
				entry.miny, entry.maxy,
				entry.minz, entry.maxz,
			);
			if (clash.length > 0) {
				const other = store.read(clash[0]);
				throw new Error(
					`map: type "${entry.type}" does not allow overlap, but ` +
					`[${entry.minx},${entry.maxx}]x[${entry.miny},${entry.maxy}]x[${entry.minz},${entry.maxz}] and ` +
					`[${other.minx},${other.maxx}]x[${other.miny},${other.maxy}]x[${other.minz},${other.maxz}] share a cell. ` +
					'Bounds are inclusive, so [0,10] and [10,20] touch at 10.',
				);
			}
		}
		return store.add(entry);
	}

	function removeDataAt(type, minx, maxx, miny, maxy, minz, maxz) {
		types.get(type);
		store.remove(store.query(type, minx, maxx, miny, maxy, minz, maxz));
	}

	function serialize() {
		if (header === null) throw new Error('map: nothing to serialize, load a map first');
		return serializeJSON(header, store.liveIds().map(store.read));
	}

	function clear() {
		store.clear();
		header = null;
	}

	return {
		loadMap,
		getDataAt,
		getOneAt,
		setDataAt,
		removeDataAt,
		registerType: types.register,
		serialize,
		clear,
		header: () => (header === null ? null : { ...header }),
		memoryBytes: () => store.boundsBytes(),
	};
}
