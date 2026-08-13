// Tracks the primary mouse button and pointer position for continuous input.

export function createMouse({ target = null } = {}) {
	let buttonDown = false;
	let pos = { x: 0, y: 0 };
	const handlers = {
		mousedown: new Set(),
		mouseup: new Set(),
		mousemove: new Set(),
	};
	const node = target ?? window;
	let attached = false;

	function emit(name, payload) {
		for (const fn of handlers[name]) fn(payload);
	}

	function onMouseDown(event) {
		if (event.button !== 0) return;
		buttonDown = true;
		pos = { x: event.clientX, y: event.clientY };
		emit('mousedown', { x: pos.x, y: pos.y });
	}

	function onMouseUp(event) {
		if (event.button !== 0) return;
		buttonDown = false;
		pos = { x: event.clientX, y: event.clientY };
		emit('mouseup', { x: pos.x, y: pos.y });
	}

	function onMouseMove(event) {
		pos = { x: event.clientX, y: event.clientY };
		emit('mousemove', { x: pos.x, y: pos.y });
	}

	function attach() {
		if (attached) return;
		node.addEventListener('mousedown', onMouseDown);
		node.addEventListener('mouseup', onMouseUp);
		node.addEventListener('mousemove', onMouseMove);
		attached = true;
	}

	attach();

	return {
		get attached() {
			return attached;
		},

		isButtonDown() {
			return buttonDown;
		},

		getPosition() {
			return { ...pos };
		},

		on(name, handler) {
			handlers[name]?.add(handler);
		},

		off(name, handler) {
			handlers[name]?.delete(handler);
		},

		attach,

		dispose() {
			buttonDown = false;
			for (const set of Object.values(handlers)) set.clear();
			if (!attached) return;
			node.removeEventListener('mousedown', onMouseDown);
			node.removeEventListener('mouseup', onMouseUp);
			node.removeEventListener('mousemove', onMouseMove);
			attached = false;
		},
	};
}
