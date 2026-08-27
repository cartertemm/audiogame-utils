// @ts-self-types="./group.d.ts"
// A named set of clients you can send to. A group holds no opinion about what
// it represents, so the same primitive serves a match, a team, a chat channel,
// and an audio zone.

export function createGroup(name, { persist = false, onEmpty = null } = {}) {
	const members = new Set();

	function excluded(except) {
		if (except == null) return [];
		return Array.isArray(except) ? except : [except];
	}

	const group = {
		name,
		persist,
		data: {},

		get clients() {
			return [...members];
		},

		has(client) {
			return members.has(client);
		},

		add(client) {
			if (members.has(client)) return group;
			members.add(client);
			client.groups.add(group);
			return group;
		},

		remove(client) {
			if (!members.delete(client)) return group;
			client.groups.delete(group);
			if (members.size === 0 && !persist) onEmpty?.(group);
			return group;
		},

		send(msg, { except = null } = {}) {
			const skip = excluded(except);
			for (const client of [...members]) {
				if (skip.includes(client)) continue;
				client.send(msg);
			}
		},

		// An explicit close empties a persistent group too, because the caller
		// asked for it rather than the group draining on its own.
		close() {
			for (const client of [...members]) {
				members.delete(client);
				client.groups.delete(group);
			}
			onEmpty?.(group);
		},
	};

	return group;
}
