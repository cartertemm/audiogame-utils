// Tracks pressed keys and emits keyboard events. The `keypress` event excludes
// operating system repeat events so it represents one discrete action.

export function createKeyboard({ target = null } = {}) {
	const pressed = new Set();
	const handlers = {
		keydown: new Set(),
		keyup: new Set(),
		keypress: new Set(),
	};
	const node = target ?? window;
	let attached = false;

	function emit(eventName, event) {
		for (const fn of handlers[eventName]) fn(event);
	}

	function onKeyDown(event) {
		pressed.add(event.key.toLowerCase());
		emit('keydown', event);
		if (!event.repeat) emit('keypress', event);
	}

	function onKeyUp(event) {
		pressed.delete(event.key.toLowerCase());
		emit('keyup', event);
	}

	function attach() {
		if (attached) return;
		node.addEventListener('keydown', onKeyDown);
		node.addEventListener('keyup', onKeyUp);
		attached = true;
	}

	attach();

	return {
		get attached() {
			return attached;
		},

		isDown(key) {
			return pressed.has(key.toLowerCase());
		},

		on(eventName, handler) {
			handlers[eventName]?.add(handler);
		},

		off(eventName, handler) {
			handlers[eventName]?.delete(handler);
		},

		attach,

		dispose() {
			pressed.clear();
			for (const set of Object.values(handlers)) set.clear();
			if (!attached) return;
			node.removeEventListener('keydown', onKeyDown);
			node.removeEventListener('keyup', onKeyUp);
			attached = false;
		},
	};
}
