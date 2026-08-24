// Tracks gamepad button presses, analog stick axes, and haptic feedback.

const BUTTON_ALIASES = {
	a: 0, south: 0,
	b: 1, east: 1,
	x: 2, west: 2,
	y: 3, north: 3,
	lb: 4, l1: 4,
	rb: 5, r1: 5,
	lt: 6, l2: 6,
	rt: 7, r2: 7,
	select: 8, back: 8,
	start: 9, menu: 9,
	l3: 10, leftstick: 10,
	r3: 11, rightstick: 11,
	dpad_up: 12, up: 12,
	dpad_down: 13, down: 13,
	dpad_left: 14, left: 14,
	dpad_right: 15, right: 15,
	guide: 16, home: 16,
};

export function createGamepad({ target = null, deadzone = 0.25, index = null } = {}) {
	const node = target ?? (typeof window !== 'undefined' ? window : null);
	const handlers = {
		gamepadconnected: new Set(),
		gamepaddisconnected: new Set(),
		buttonpress: new Set(),
		buttonrelease: new Set(),
	};
	let activeIndex = index;
	let previousPressed = new Set();
	let currentPressed = new Set();
	let justPressed = new Set();
	let justReleased = new Set();
	let attached = false;

	function resolveButtonIndex(btn) {
		if (typeof btn === 'number') return btn;
		if (typeof btn === 'string') {
			const lower = btn.toLowerCase();
			if (BUTTON_ALIASES[lower] !== undefined) return BUTTON_ALIASES[lower];
			const parsed = parseInt(lower, 10);
			if (!Number.isNaN(parsed)) return parsed;
		}
		return -1;
	}

	function getGamepads() {
		if (typeof navigator === 'undefined' || !navigator.getGamepads) return [];
		return Array.from(navigator.getGamepads()).filter(Boolean);
	}

	function getActiveGamepad() {
		const pads = getGamepads();
		if (pads.length === 0) return null;
		if (activeIndex !== null) {
			return pads.find(p => p && p.index === activeIndex) ?? null;
		}
		return pads[0];
	}

	function onConnect(event) {
		if (activeIndex === null) activeIndex = event.gamepad.index;
		for (const fn of handlers.gamepadconnected) fn(event);
	}

	function onDisconnect(event) {
		if (activeIndex === event.gamepad.index) activeIndex = null;
		for (const fn of handlers.gamepaddisconnected) fn(event);
	}

	function poll() {
		const pad = getActiveGamepad();
		justPressed.clear();
		justReleased.clear();
		if (!pad) {
			for (const btnIndex of currentPressed) {
				justReleased.add(btnIndex);
			}
			previousPressed = currentPressed;
			currentPressed = new Set();
			return;
		}
		const newPressed = new Set();
		pad.buttons.forEach((b, i) => {
			const pressed = typeof b === 'object' ? b.pressed : b > 0.5;
			if (pressed) newPressed.add(i);
		});

		for (const btnIndex of newPressed) {
			if (!currentPressed.has(btnIndex)) {
				justPressed.add(btnIndex);
				for (const fn of handlers.buttonpress) fn({ button: btnIndex, gamepad: pad });
			}
		}

		for (const btnIndex of currentPressed) {
			if (!newPressed.has(btnIndex)) {
				justReleased.add(btnIndex);
				for (const fn of handlers.buttonrelease) fn({ button: btnIndex, gamepad: pad });
			}
		}

		previousPressed = currentPressed;
		currentPressed = newPressed;
	}

	function attach() {
		if (attached || !node) return;
		node.addEventListener('gamepadconnected', onConnect);
		node.addEventListener('gamepaddisconnected', onDisconnect);
		attached = true;
	}

	attach();

	return {
		get attached() {
			return attached;
		},

		get index() {
			return activeIndex;
		},

		set index(val) {
			activeIndex = val;
		},

		poll,

		isDown(button) {
			const idx = resolveButtonIndex(button);
			return idx >= 0 && currentPressed.has(idx);
		},

		pressed(button) {
			const idx = resolveButtonIndex(button);
			return idx >= 0 && justPressed.has(idx);
		},

		released(button) {
			const idx = resolveButtonIndex(button);
			return idx >= 0 && justReleased.has(idx);
		},

		getAxis(axisIndex) {
			const pad = getActiveGamepad();
			if (!pad || !pad.axes || axisIndex < 0 || axisIndex >= pad.axes.length) return 0;
			const val = pad.axes[axisIndex];
			if (Math.abs(val) < deadzone) return 0;
			return val;
		},

		async vibrate({ duration = 200, strongMagnitude = 1.0, weakMagnitude = 1.0 } = {}) {
			const pad = getActiveGamepad();
			if (!pad || !pad.vibrationActuator) return false;
			try {
				await pad.vibrationActuator.playEffect('dual-rumble', {
					startDelay: 0,
					duration,
					strongMagnitude,
					weakMagnitude,
				});
				return true;
			} catch {
				return false;
			}
		},

		on(eventName, handler) {
			handlers[eventName]?.add(handler);
		},

		off(eventName, handler) {
			handlers[eventName]?.delete(handler);
		},

		attach,

		dispose() {
			previousPressed.clear();
			currentPressed.clear();
			justPressed.clear();
			justReleased.clear();
			for (const set of Object.values(handlers)) set.clear();
			if (!attached || !node) return;
			node.removeEventListener('gamepadconnected', onConnect);
			node.removeEventListener('gamepaddisconnected', onDisconnect);
			attached = false;
		},
	};
}
