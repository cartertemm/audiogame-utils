// A self-voicing menu driven by a virtual cursor.
//
// The cursor is not DOM focus. A focus trap puts `role="application"` on the
// container so the browser stops interpreting keys, and the rendered fields sit
// inside an `aria-hidden` list so the screen reader never announces them twice.
// The menu speaks each row itself, which is what lets a slider read "55 percent"
// while moving and "Volume, 55 percent" on arrival.

import { createFocusTrap } from '../focus.js';
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
	let wrapBlocked = false;
	let wrapTimer = 0;
	let container = null;
	let trap = null;
	let running = false;

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

	function enabledIndexes() {
		const usable = [];
		items.forEach((item, index) => {
			if (!item.disabled) usable.push(index);
		});
		return usable;
	}

	// A browser cannot block, so a wrap drops movement input for the delay
	// instead. The player-visible effect is the same: a held arrow key does not
	// trample the wrap sound.
	function blockWrap() {
		if (config.wrapDelay <= 0) return;
		wrapBlocked = true;
		clearTimeout(wrapTimer);
		wrapTimer = setTimeout(() => { wrapBlocked = false; }, config.wrapDelay);
	}

	function move(direction) {
		if (wrapBlocked) return;
		const usable = enabledIndexes();
		if (usable.length === 0) {
			sounds.play('edge');
			return;
		}
		const position = usable.indexOf(focusedIndex);
		if (position === -1) {
			sounds.play('click');
			setFocus(direction > 0 ? usable[0] : usable[usable.length - 1]);
			return;
		}
		const next = position + direction;
		if (next >= 0 && next < usable.length) {
			sounds.play('click');
			setFocus(usable[next]);
			return;
		}
		if (!config.wrap) {
			sounds.play('edge');
			announce(items[focusedIndex].speak());
			return;
		}
		sounds.play('wrap');
		blockWrap();
		setFocus(next < 0 ? usable[usable.length - 1] : usable[0]);
	}

	function jumpToEnd(direction) {
		const usable = enabledIndexes();
		if (usable.length === 0) {
			sounds.play('edge');
			return;
		}
		const target = direction > 0 ? usable[0] : usable[usable.length - 1];
		if (target === focusedIndex) {
			sounds.play('edge');
			announce(items[target].speak());
			return;
		}
		sounds.play('click');
		setFocus(target);
	}

	function jumpToLetter(letter) {
		const usable = enabledIndexes();
		if (usable.length === 0) return;
		const lower = letter.toLowerCase();
		const start = usable.indexOf(focusedIndex);
		for (let offset = 1; offset <= usable.length; offset += 1) {
			const index = usable[(start + offset + usable.length) % usable.length];
			if (!items[index].label.toLowerCase().startsWith(lower)) continue;
			sounds.play('click');
			setFocus(index);
			return;
		}
	}

	function adjustFocused(direction) {
		const item = items[focusedIndex];
		if (!item || item.disabled) return;
		if (!item.adjust(direction)) sounds.play('edge');
	}

	// Task 5 resolves the pending `run()` promise here.
	let pending = null;

	function settle(value) {
		running = false;
		const resolve = pending?.resolve;
		pending = null;
		resolve?.(value);
	}

	function activateFocused() {
		const item = items[focusedIndex];
		if (!item || item.disabled) return;
		if (item.type === 'checkbox') {
			item.toggle();
			return;
		}
		if (item.type !== 'text') return;
		sounds.play('select');
		settle(item);
	}

	function spaceFocused() {
		const item = items[focusedIndex];
		if (!item || item.disabled) return;
		if (item.type === 'checkbox') {
			item.toggle();
			return;
		}
		activateFocused();
	}

	function open() {
		container = el('div', { class: 'menu' });
		list = el('div', { class: 'menu-items', 'aria-hidden': 'true' });
		container.appendChild(list);
		for (const item of items) list.appendChild(item.node);
		config.root.appendChild(container);
		// An application ancestor means the game already runs its own trap, so
		// making a second one would fight it and steal focus on release.
		if (config.root.closest('[role="application"]')) {
			container.setAttribute('tabindex', '-1');
			container.focus();
		} else {
			trap = createFocusTrap(container, { label: config.label });
		}
		sounds.play('open');
		let text = config.introText;
		if (config.focusFirstItem) {
			const usable = enabledIndexes();
			if (usable.length > 0) {
				setFocus(usable[0], { silent: true });
				const first = items[usable[0]].speak();
				text = text ? `${text}. ${first}` : first;
			}
		}
		announce(text);
	}

	function run() {
		if (running) throw new Error('menu.run() is already pending');
		running = true;
		if (!container) open();
		return new Promise((resolve) => { pending = { resolve }; });
	}

	function close() {
		if (container) {
			clearTimeout(wrapTimer);
			wrapBlocked = false;
			sounds.play('close');
			trap?.release();
			trap = null;
			setFocus(-1, { silent: true });
			container.remove();
			container = null;
			list = null;
		}
		settle(null);
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

		run,
		close,

		_move: move,
		_jumpToEnd: jumpToEnd,
		_jumpToLetter: jumpToLetter,
		_adjustFocused: adjustFocused,
		_activateFocused: activateFocused,
		_spaceFocused: spaceFocused,

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
