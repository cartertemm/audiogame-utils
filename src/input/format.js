// Formats input bindings as controls help that a player can hear or read.
// Generating help from the active bindings keeps the text synchronized.

const SPECIAL_KEYS = {
	' ': 'Space',
	'arrowleft': 'Arrow Left',
	'arrowright': 'Arrow Right',
	'arrowup': 'Arrow Up',
	'arrowdown': 'Arrow Down',
	'escape': 'Escape',
	'enter': 'Enter',
	'tab': 'Tab',
	'shift': 'Shift',
	'control': 'Control',
	'alt': 'Alt',
	'meta': 'Meta',
	'backspace': 'Backspace',
};

const FINGER_WORDS = { 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five' };

function formatKey(key) {
	if (key === undefined || key === null || key === '') return '';
	if (SPECIAL_KEYS[key] !== undefined) return SPECIAL_KEYS[key];
	if (key.length === 1) return key.toUpperCase();
	return key[0].toUpperCase() + key.slice(1);
}

function fingerPrefix(n) {
	if (!n || n <= 1) return '';
	const word = FINGER_WORDS[n] ?? String(n);
	return `${word} finger `;
}

function tapCountWord(n) {
	if (!n || n === 1) return 'Tap';
	if (n === 2) return 'Double tap';
	if (n === 3) return 'Triple tap';
	return `${n}-tap`;
}

function formatTap(binding) {
	const prefix = fingerPrefix(binding.fingerCount);
	const base = tapCountWord(binding.tapCount);
	if (!prefix) return base;
	return `${prefix}${base.toLowerCase()}`;
}

function formatSwipe(binding) {
	const prefix = fingerPrefix(binding.fingerCount);
	const dir = binding.direction ?? '';
	if (!prefix) {
		return `Swipe ${dir}`.trimEnd();
	}
	return `${prefix}swipe ${dir}`.trimEnd();
}

export function formatBinding(binding) {
	switch (binding.kind) {
		case 'hold':
		case 'press':
			return formatKey(binding.key);
		case 'tap':
			return formatTap(binding);
		case 'swipe':
			return formatSwipe(binding);
		default:
			return '';
	}
}
