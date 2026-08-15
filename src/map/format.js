const HEADER = ['name', 'maxx', 'maxy', 'maxz'];

export function parseJSON(input) {
	let data;
	if (typeof input === 'string') {
		try {
			data = JSON.parse(input);
		} catch (cause) {
			throw new Error('map: file is not valid JSON', { cause });
		}
	} else {
		data = input;
	}
	if (data === null || typeof data !== 'object') throw new Error('map: file is not an object');
	for (const key of HEADER) {
		if (data[key] === undefined) throw new Error(`map: file is missing required header field "${key}"`);
	}
	if (typeof data.name !== 'string') {
		throw new Error(`map: header field "name" must be a string, got ${JSON.stringify(data.name)}`);
	}
	for (const key of ['maxx', 'maxy', 'maxz']) {
		const value = data[key];
		if (!Number.isInteger(value) || value < 0) {
			throw new Error(`map: header field "${key}" must be a non-negative integer, got ${JSON.stringify(value)}`);
		}
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
