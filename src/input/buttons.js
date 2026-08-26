// Standard gamepad button layout, shared by the gamepad, the input handler,
// and the binding formatter.

export const BUTTON_ALIASES = {
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

export const BUTTON_NAMES = {
	0: 'Gamepad A',
	1: 'Gamepad B',
	2: 'Gamepad X',
	3: 'Gamepad Y',
	4: 'Gamepad LB',
	5: 'Gamepad RB',
	6: 'Gamepad LT',
	7: 'Gamepad RT',
	8: 'Gamepad Back',
	9: 'Gamepad Start',
	10: 'Gamepad L3',
	11: 'Gamepad R3',
	12: 'Gamepad D-Pad Up',
	13: 'Gamepad D-Pad Down',
	14: 'Gamepad D-Pad Left',
	15: 'Gamepad D-Pad Right',
	16: 'Gamepad Guide',
};

export function resolveButtonIndex(button) {
	if (typeof button === 'number') return button;
	if (typeof button === 'string') {
		const lower = button.toLowerCase();
		if (BUTTON_ALIASES[lower] !== undefined) return BUTTON_ALIASES[lower];
		const parsed = parseInt(lower, 10);
		if (!Number.isNaN(parsed)) return parsed;
	}
	return -1;
}
