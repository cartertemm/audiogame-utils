const HEADER = ['name', 'maxx', 'maxy', 'maxz'];

export function parseJSON(input) {
	const data = typeof input === 'string' ? JSON.parse(input) : input;
	if (data === null || typeof data !== 'object') throw new Error('map: file is not an object');
	for (const key of HEADER) {
		if (data[key] === undefined) throw new Error(`map: file is missing required header field "${key}"`);
	}
	return {
		name: data.name,
		maxx: data.maxx,
		maxy: data.maxy,
		maxz: data.maxz,
		entries: data.entries ?? [],
	};
}

export function serializeJSON(header, entries) {
	return {
		name: header.name,
		maxx: header.maxx,
		maxy: header.maxy,
		maxz: header.maxz,
		entries,
	};
}
