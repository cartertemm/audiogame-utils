// Turns the menu's sound options into sfx handles.
//
// A string is a URL, so it takes the prefix and suffix. Anything else goes to
// `audio.sfx()` untouched, which keeps bundler loader functions intact, and an
// already-built handle is used as it is. The menu does not own that handle, so
// it never stops or disposes it.

function isHandle(source) {
	return typeof source === 'object' && source !== null && typeof source.play === 'function';
}

export function createMenuSounds({ audio = null, prefix = '', suffix = '', sources = {} } = {}) {
	const handles = new Map();

	function resolve(name) {
		if (handles.has(name)) return handles.get(name);
		const source = sources[name];
		let handle = null;
		if (audio && source) {
			if (isHandle(source)) handle = source;
			else handle = audio.sfx(typeof source === 'string' ? prefix + source + suffix : source);
		}
		handles.set(name, handle);
		return handle;
	}

	return {
		play(name) {
			resolve(name)?.play();
		},
	};
}
