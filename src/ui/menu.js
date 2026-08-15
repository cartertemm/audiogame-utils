// A self-voicing menu driven by a virtual cursor.
//
// The cursor is not DOM focus. A focus trap puts `role="application"` on the
// container so the browser stops interpreting keys, and the rendered fields sit
// inside an `aria-hidden` list so the screen reader never announces them twice.
// The menu speaks each row itself, which is what lets a slider read "55 percent"
// while moving and "Volume, 55 percent" on arrival.

import { el } from './dom.js';
import { MenuItem } from './menuItem.js';
import { createMenuSounds } from './menuSounds.js';

const DEFAULTS = {
	audio: null,
	introText: '',
	clickSound: '',
	selectSound: '',
	edgeSound: '',
	wrapSound: '',
	openSound: '',
	closeSound: '',
	soundsPrefix: '',
	soundsSuffix: '',
	wrap: false,
	wrapDelay: 10,
	focusFirstItem: false,
	firstLetterNavigation: true,
	label: '',
};

export function createMenu(options = {}) {
	if (!options.root) throw new Error('createMenu requires a root element');
	if (!options.speech) throw new Error('createMenu requires a speech instance');
	const config = { ...DEFAULTS, ...options };
	const speech = config.speech;
	const items = [];
	const sounds = createMenuSounds({
		audio: config.audio,
		prefix: config.soundsPrefix,
		suffix: config.soundsSuffix,
		sources: {
			click: config.clickSound,
			select: config.selectSound,
			edge: config.edgeSound,
			wrap: config.wrapSound,
			open: config.openSound,
			close: config.closeSound,
		},
	});

	let list = null;
	let focusedIndex = -1;
	// Held separately so deleting or rebuilding an item cannot leave a stale
	// class behind on a node the index no longer points at.
	let focusedNode = null;

	function announce(text) {
		if (text) speech.speak(text, true);
	}

	function setFocus(index, { silent = false } = {}) {
		focusedNode?.classList.remove('focused');
		focusedIndex = index >= 0 && index < items.length ? index : -1;
		focusedNode = focusedIndex >= 0 ? items[focusedIndex].node : null;
		focusedNode?.classList.add('focused');
		if (!silent && focusedIndex >= 0) announce(items[focusedIndex].speak());
	}

	function resolveIndex(target) {
		if (target === null || target === undefined) return -1;
		if (target instanceof MenuItem) return items.indexOf(target);
		if (typeof target === 'number') return target;
		return items.findIndex(item => item.id === target);
	}

	// Guard the null id, or a lookup for `null` would match every item that was
	// added without one.
	function itemById(id) {
		if (id === null || id === undefined) return null;
		return items.find(item => item.id === id) ?? null;
	}

	function addItem(type, label, itemOptions = {}) {
		const id = itemOptions.id ?? null;
		if (id !== null && itemById(id)) throw new Error(`duplicate menu item id: ${id}`);
		const item = new MenuItem(api, type, label, itemOptions);
		const requested = itemOptions.position ?? -1;
		const index = requested < 0 || requested > items.length ? items.length : requested;
		items.splice(index, 0, item);
		if (list) list.insertBefore(item.node, list.children[index] ?? null);
		if (focusedIndex >= index) focusedIndex += 1;
		return item;
	}

	function deleteItem(index, resetCursor = true) {
		const item = items[index];
		if (!item) return false;
		items.splice(index, 1);
		item.node.remove();
		if (resetCursor) setFocus(items.length ? 0 : -1, { silent: true });
		else if (focusedIndex > index) setFocus(focusedIndex - 1, { silent: true });
		// Deleting the focused item leaves the cursor on whatever slid into the
		// slot, or on the new last item when the tail went away. Without this the
		// index and the node reference disagree and the focused class strands on
		// the removed node.
		else if (focusedIndex === index) setFocus(Math.min(index, items.length - 1), { silent: true });
		return true;
	}

	function deleteAllItems() {
		for (const item of items) item.node.remove();
		items.length = 0;
		setFocus(-1, { silent: true });
	}

	const api = {
		get items() {
			return [...items];
		},

		get focusedItem() {
			return focusedIndex >= 0 ? items[focusedIndex] : null;
		},

		set focusedItem(target) {
			setFocus(resolveIndex(target));
		},

		get focusedIndex() {
			return focusedIndex;
		},

		set focusedIndex(index) {
			setFocus(resolveIndex(index));
		},

		get values() {
			const out = {};
			for (const item of items) {
				if (item.id !== null && item.value !== undefined) out[item.id] = item.value;
			}
			return out;
		},

		item(id) {
			return itemById(id);
		},

		value(id) {
			return itemById(id)?.value;
		},

		addItem,

		addTextItem(text, itemOptions = {}) {
			return addItem('text', text, itemOptions);
		},

		addSlider(text, min, max, defaultValue, itemOptions = {}) {
			return addItem('slider', text, { ...itemOptions, min, max, defaultValue });
		},

		addCheckbox(text, defaultState = false, itemOptions = {}) {
			return addItem('checkbox', text, { ...itemOptions, defaultState });
		},

		deleteItem,
		deleteAllItems,

		_rebuild(item) {
			const wasFocused = focusedNode === item.node;
			item.rebuild();
			if (!wasFocused) return;
			focusedNode = item.node;
			focusedNode.classList.add('focused');
		},

		_valueChanged(item) {
			if (items[focusedIndex] !== item) return;
			announce(item.speakValue());
		},
	};

	return api;
}
