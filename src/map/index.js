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
			const touched = new Set();
			parsed.entries.forEach((entry) => {
				added.push(store.add(entry));
				touched.add(entry.type);
			});
			for (const type of touched) {
				if (types.get(type).overlap === 'error') store.assertNoOverlap(type);
			}
		} catch (err) {
			store.remove(added);
			throw err;
		}

		header = next_header;
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
		types.validate(entry, store.size());
		assert_in_bounds(entry, store.size(), header);
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
		store,
	};
}
