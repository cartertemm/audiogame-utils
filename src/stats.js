// Tracks numeric and string stats, formatted output, sorting, and serialization.
// Originally part of the NVGT scripting language (https://nvgt.dev).
// Ported to Javascript for use in the audiogame-utils library by Quin Gillespie and Carter Temm

export const STAT_SORT_MODE = {
	NONE: 'none',
	ADD_ORDER: 'add_order',
	VALUE: 'value',
};

let _nextStat = 0;

export function defaultStatCallback(stat) {
	if (!stat) return '';
	if (stat.text.includes('%0')) {
		return stat.text.replace('%0', String(stat.val));
	}
	return stat.text.length > 0 ? stat.text : String(stat.val);
}

export class Stat {
	constructor(name, val, text = '%0', callback = null, user = null) {
		this.name = name;
		this.val = val;
		this.text = text && text.length > 0 ? text : '%0';
		this.callback = callback ?? defaultStatCallback;
		this.user = user ?? {};
		this.sortCounter = _nextStat++;
	}

	format() {
		if (typeof this.callback === 'function') {
			return this.callback(this);
		}
		return `${this.name}=${this.val}`;
	}

	toString() {
		return this.format();
	}

	valueOf() {
		return this.val;
	}
}

export class StatSet {
	constructor(other = null) {
		this.stats = new Map();
		if (other) {
			this.addSet(other);
		}
	}

	get size() {
		return this.stats.size;
	}

	get_size() {
		return this.stats.size;
	}

	add(name, val, text = '%0', callback = null, user = null) {
		if (this.stats.has(name)) {
			return null;
		}
		const s = new Stat(name, val, text, callback, user);
		this.stats.set(name, s);
		return s;
	}

	update(name, val) {
		const s = this.stats.get(name);
		if (s) {
			s.val = val;
		}
	}

	mod(name, delta) {
		const s = this.stats.get(name);
		if (s) {
			s.val += delta;
		}
	}

	delete(name) {
		return this.stats.delete(name);
	}

	remove(name) {
		return this.delete(name);
	}

	reset() {
		this.stats.clear();
	}

	clear() {
		this.reset();
	}

	get(name) {
		return this.stats.get(name) ?? null;
	}

	exists(name) {
		return this.stats.has(name);
	}

	has(name) {
		return this.exists(name);
	}

	getStats() {
		return Array.from(this.stats.values());
	}

	get_stats() {
		return this.getStats();
	}

	list(sortMode = STAT_SORT_MODE.NONE, sortInFront = [], sortBehind = []) {
		if (this.stats.size === 0) return [];
		const list = Array.from(this.stats.values());

		if (sortMode === STAT_SORT_MODE.ADD_ORDER || sortMode === 1) {
			list.sort((a, b) => Number(a.sortCounter) - Number(b.sortCounter));
		} else if (sortMode === STAT_SORT_MODE.VALUE || sortMode === 2) {
			list.sort((a, b) => {
				if (typeof a.val === 'number' && typeof b.val === 'number') {
					return a.val - b.val;
				}
				return String(a.val).localeCompare(String(b.val));
			});
		}

		const result = list.map(s => s.name);

		const frontList = Array.isArray(sortInFront) ? sortInFront : [];
		for (let i = frontList.length - 1; i >= 0; i--) {
			const name = frontList[i];
			const idx = result.indexOf(name);
			if (idx >= 0) {
				const item = result.splice(idx, 1)[0];
				result.unshift(item);
			}
		}

		const behindList = Array.isArray(sortBehind) ? sortBehind : [];
		for (let i = 0; i < behindList.length; i++) {
			const name = behindList[i];
			const idx = result.indexOf(name);
			if (idx >= 0) {
				const item = result.splice(idx, 1)[0];
				result.push(item);
			}
		}

		return result;
	}

	addSet(other) {
		if (!other) return this;
		const otherStats = other instanceof StatSet ? other.getStats() : (Array.isArray(other) ? other : Object.values(other));
		for (const st of otherStats) {
			if (!st || !st.name) continue;
			if (this.exists(st.name)) {
				const existing = this.get(st.name);
				existing.val += st.val;
			} else {
				const created = this.add(st.name, st.val, st.text, st.callback, st.user);
				if (created && typeof st.sortCounter === 'number') {
					created.sortCounter = st.sortCounter;
				}
			}
		}
		return this;
	}

	serializeLinear() {
		let output = '';
		for (const [name, st] of this.stats) {
			output += `${name}=${st.val}\n`;
		}
		return output;
	}

	serialize_linear() {
		return this.serializeLinear();
	}

	deserializeLinear(data) {
		if (!data || typeof data !== 'string') return false;
		const lines = data.split('\n');
		let foundValue = false;
		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			const eqIdx = trimmed.indexOf('=');
			if (eqIdx <= 0) continue;
			const key = trimmed.slice(0, eqIdx).trim();
			const rawVal = trimmed.slice(eqIdx + 1).trim();
			let parsedVal = rawVal;
			if (/^-?\d+(\.\d+)?$/.test(rawVal)) {
				parsedVal = Number(rawVal);
			}
			if (this.exists(key)) {
				this.update(key, parsedVal);
			} else {
				this.add(key, parsedVal);
			}
			foundValue = true;
		}
		return foundValue;
	}

	deserialize_linear(data) {
		return this.deserializeLinear(data);
	}

	serialize() {
		const records = [];
		for (const st of this.stats.values()) {
			records.push({
				name: st.name,
				val: st.val,
				text: st.text,
			});
		}
		return JSON.stringify(records);
	}

	deserialize(data) {
		if (!data) return false;
		try {
			const parsed = typeof data === 'string' ? JSON.parse(data) : data;
			if (!Array.isArray(parsed)) return false;
			for (const item of parsed) {
				if (!item || !item.name) continue;
				if (this.exists(item.name)) {
					this.update(item.name, item.val);
				} else {
					this.add(item.name, item.val, item.text);
				}
			}
			return true;
		} catch {
			return false;
		}
	}
}

export function createStatSet(other = null) {
	return new StatSet(other);
}
