// Maps named game actions to keys, taps, and swipes. Game code can check an
// action without depending on its configured input.
//
// Consume actions in two ways:
//   `wasTriggered(name)` polls an action and consumes its discrete trigger.
//   `on(name, handler)` invokes a callback when an action occurs.
// Both methods report the same action. A `hold` binding is available only
// through polling because it does not produce a discrete trigger.

export function createInputHandler({ keyboard = null, touch = null, attach: autoAttach = true } = {}) {
	const bindings = new Map();
	const handlers = new Map();
	const pending = new Set();
	let attached = false;
	let keyPressHandler = null;
	let tapHandler = null;
	let swipeHandler = null;

	function fire(name) {
		pending.add(name);
		const set = handlers.get(name);
		if (!set) return;
		for (const h of set) h({ name });
	}

	function matchesSpec(event, spec) {
		for (const key of Object.keys(spec)) {
			if (event[key] !== spec[key]) return false;
		}
		return true;
	}

	function handleKeyPress(event) {
		const key = event.key.toLowerCase();
		for (const [name, b] of bindings) {
			if (b.press.includes(key)) fire(name);
		}
	}

	function handleGesture(kind) {
		return event => {
			for (const [name, b] of bindings) {
				for (const spec of b[kind]) {
					if (matchesSpec(event, spec)) {
						fire(name);
						break;
					}
				}
			}
		};
	}

	function serialize(name, b) {
		const list = [];
		for (const key of b.hold) list.push({ kind: 'hold', key });
		for (const key of b.press) list.push({ kind: 'press', key });
		for (const spec of b.tap) list.push({ kind: 'tap', ...spec });
		for (const spec of b.swipe) list.push({ kind: 'swipe', ...spec });
		return { name, bindings: list };
	}

	function attach() {
		if (attached) return;
		keyPressHandler = handleKeyPress;
		tapHandler = handleGesture('tap');
		swipeHandler = handleGesture('swipe');
		keyboard?.on('keypress', keyPressHandler);
		touch?.on('tap', tapHandler);
		touch?.on('swipe', swipeHandler);
		attached = true;
	}

	function detach() {
		if (!attached) return;
		keyboard?.off('keypress', keyPressHandler);
		touch?.off('tap', tapHandler);
		touch?.off('swipe', swipeHandler);
		keyPressHandler = null;
		tapHandler = null;
		swipeHandler = null;
		attached = false;
	}

	if (autoAttach) attach();

	return {
		get attached() {
			return attached;
		},

		bind(name, binding) {
			bindings.set(name, {
				hold: binding.hold ?? [],
				press: binding.press ?? [],
				tap: binding.tap ?? [],
				swipe: binding.swipe ?? [],
			});
		},

		unbind(name) {
			bindings.delete(name);
			handlers.delete(name);
			pending.delete(name);
		},

		wasTriggered(name) {
			if (!attached) return false;
			const b = bindings.get(name);
			if (!b) return false;
			if (pending.has(name)) {
				pending.delete(name);
				return true;
			}
			for (const key of b.hold) {
				if (keyboard?.isDown(key)) return true;
			}
			return false;
		},

		on(name, handler) {
			if (!handlers.has(name)) handlers.set(name, new Set());
			handlers.get(name).add(handler);
		},

		off(name, handler) {
			handlers.get(name)?.delete(handler);
		},

		describe(name) {
			if (name !== undefined) {
				const b = bindings.get(name);
				return b ? serialize(name, b) : null;
			}
			const out = [];
			for (const [n, b] of bindings) out.push(serialize(n, b));
			return out;
		},

		attach,
		detach,

		dispose() {
			detach();
			bindings.clear();
			handlers.clear();
			pending.clear();
		},
	};
}
