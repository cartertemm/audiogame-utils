const AXES = ['x', 'y', 'z'];

export function createTypes() {
	const defs = new Map();

	function register(name, options = {}) {
		if (defs.has(name)) throw new Error(`map: type "${name}" is already registered`);
		const fields = options.fields ?? [];
		const overlap = options.overlap ?? 'allow';
		if (overlap !== 'allow' && overlap !== 'error') {
			throw new Error(`map: type "${name}" has overlap "${overlap}", expected "allow" or "error"`);
		}
		defs.set(name, { name, fields, overlap });
	}

	function get(name) {
		const def = defs.get(name);
		if (!def) throw new Error(`map: unknown type "${name}", register it with registerType first`);
		return def;
	}

	function validate(entry, index) {
		const def = get(entry.type);
		for (const axis of AXES) {
			const min = entry[`min${axis}`];
			const max = entry[`max${axis}`];
			if (!Number.isInteger(min)) throw new Error(`map: entry ${index} has a non-integer min${axis}`);
			if (!Number.isInteger(max)) throw new Error(`map: entry ${index} has a non-integer max${axis}`);
			if (min > max) throw new Error(`map: entry ${index} has min${axis} ${min} above max${axis} ${max}`);
		}
		for (const field of def.fields) {
			if (entry[field] === undefined) {
				throw new Error(`map: type "${def.name}" needs field "${field}", missing on entry ${index}`);
			}
		}
	}

	register('tile', { fields: ['file'], overlap: 'error' });
	register('src', { fields: ['file', 'loop'], overlap: 'allow' });
	register('zone', { fields: ['name'], overlap: 'allow' });

	return {
		register,
		get,
		has: (name) => defs.has(name),
		names: () => [...defs.keys()],
		validate,
	};
}
