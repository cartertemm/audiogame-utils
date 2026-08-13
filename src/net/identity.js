// Stores the player's client ID, session token, and display name across sessions.
// A single record keeps the client ID and session token in the same write.

const EMPTY = { clientId: null, sessionToken: null, name: null };

export function createIdentity(storage, { key = 'identity' } = {}) {
	if (!storage) throw new Error('createIdentity requires a storage');

	function get() {
		return { ...EMPTY, ...(storage.get(key, {}) ?? {}) };
	}

	return {
		get,

		// Merge fields so a display name can be stored before the server issues
		// a client ID. A later handshake can add the remaining fields.
		set(fields) {
			storage.set(key, { ...get(), ...fields });
		},

		clear() {
			storage.remove(key);
		},
	};
}
