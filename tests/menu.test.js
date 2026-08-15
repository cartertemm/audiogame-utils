import { describe, test, expect } from 'vitest';
import { createMenuSounds } from '../src/ui/menuSounds.js';

// Records what the menu asked the audio instance to build and play.
function fakeAudio() {
	const built = [];
	const played = [];
	return {
		built,
		played,
		sfx(source) {
			built.push(source);
			return { play: () => played.push(source) };
		},
	};
}

describe('menuSounds', () => {
	test('applies the prefix and suffix to a string source', () => {
		const audio = fakeAudio();
		const sounds = createMenuSounds({
			audio,
			prefix: 'sounds/',
			suffix: '.ogg',
			sources: { click: 'click' },
		});
		sounds.play('click');
		expect(audio.built).toEqual(['sounds/click.ogg']);
		expect(audio.played).toEqual(['sounds/click.ogg']);
	});

	test('builds each handle once', () => {
		const audio = fakeAudio();
		const sounds = createMenuSounds({ audio, sources: { click: 'a.ogg' } });
		sounds.play('click');
		sounds.play('click');
		expect(audio.built).toEqual(['a.ogg']);
		expect(audio.played).toEqual(['a.ogg', 'a.ogg']);
	});

	test('passes a loader function through untouched', () => {
		const audio = fakeAudio();
		const loader = () => 'ignored';
		const sounds = createMenuSounds({
			audio,
			prefix: 'sounds/',
			suffix: '.ogg',
			sources: { click: loader },
		});
		sounds.play('click');
		expect(audio.built).toEqual([loader]);
	});

	test('uses an existing handle directly and never rebuilds it', () => {
		const audio = fakeAudio();
		const plays = [];
		const handle = { play: () => plays.push(1) };
		const sounds = createMenuSounds({ audio, sources: { click: handle } });
		sounds.play('click');
		expect(audio.built).toEqual([]);
		expect(plays.length).toBe(1);
	});

	test('is silent without an audio instance', () => {
		const sounds = createMenuSounds({ audio: null, sources: { click: 'click.ogg' } });
		expect(() => sounds.play('click')).not.toThrow();
	});

	test('is silent for an unset or unknown sound', () => {
		const audio = fakeAudio();
		const sounds = createMenuSounds({ audio, sources: { click: '' } });
		sounds.play('click');
		sounds.play('nosuchsound');
		expect(audio.built).toEqual([]);
	});
});

import { MenuItem } from '../src/ui/menuItem.js';

// The item only needs these three members from its menu.
function fakeMenu() {
	const menu = {
		items: [],
		rebuilt: [],
		changed: [],
		_rebuild(item) {
			menu.rebuilt.push(item);
			item.rebuild();
		},
		_valueChanged(item) {
			menu.changed.push(item);
		},
	};
	return menu;
}

function makeItem(type, label, options = {}) {
	const menu = fakeMenu();
	const item = new MenuItem(menu, type, label, options);
	menu.items.push(item);
	return item;
}

describe('MenuItem: text', () => {
	test('renders a button carrying the label', () => {
		const item = makeItem('text', 'Start game');
		expect(item.node.tagName).toBe('BUTTON');
		expect(item.node.textContent).toBe('Start game');
		expect(item.value).toBeUndefined();
	});

	test('speaks the label and has no value announcement', () => {
		const item = makeItem('text', 'Start game');
		expect(item.speak()).toBe('Start game');
		expect(item.speakValue()).toBe('');
	});

	test('adjust does nothing', () => {
		const item = makeItem('text', 'Start game');
		expect(item.adjust(1)).toBe(false);
	});

	test('a disabled item renders disabled', () => {
		const item = makeItem('text', 'Start game', { disabled: true });
		expect(item.node.hasAttribute('disabled')).toBe(true);
	});
});

describe('MenuItem: slider', () => {
	test('clamps the default value into range', () => {
		const item = makeItem('slider', 'Volume', { min: 0, max: 100, defaultValue: 500 });
		expect(item.value).toBe(100);
	});

	test('speaks label with value, and value alone', () => {
		const item = makeItem('slider', 'Volume', { min: 0, max: 100, defaultValue: 50 });
		expect(item.speak()).toBe('Volume, 50');
		expect(item.speakValue()).toBe('50');
	});

	test('uses format in both announcements', () => {
		const item = makeItem('slider', 'Volume', {
			min: 0, max: 100, defaultValue: 50,
			format: (v) => `${v} percent`,
		});
		expect(item.speak()).toBe('Volume, 50 percent');
		expect(item.speakValue()).toBe('50 percent');
	});

	test('adjust moves by step and reports the change', () => {
		const item = makeItem('slider', 'Volume', { min: 0, max: 100, step: 5, defaultValue: 50 });
		expect(item.adjust(1)).toBe(true);
		expect(item.value).toBe(55);
		expect(item.adjust(-1)).toBe(true);
		expect(item.value).toBe(50);
	});

	test('adjust at the boundary returns false and does not move', () => {
		const item = makeItem('slider', 'Volume', { min: 0, max: 100, step: 5, defaultValue: 100 });
		expect(item.adjust(1)).toBe(false);
		expect(item.value).toBe(100);
	});

	test('a change syncs the input and the readout', () => {
		const item = makeItem('slider', 'Volume', {
			min: 0, max: 100, step: 5, defaultValue: 50,
			format: (v) => `${v} percent`,
		});
		item.value = 75;
		const input = item.node.querySelector('input');
		expect(input.value).toBe('75');
		expect(input.getAttribute('aria-valuetext')).toBe('75 percent');
		expect(item.node.querySelector('span').textContent).toBe('75 percent');
	});

	test('a change fires onChange and notifies the menu once', () => {
		const menu = fakeMenu();
		const seen = [];
		const item = new MenuItem(menu, 'slider', 'Volume', {
			min: 0, max: 100, defaultValue: 50,
			onChange: (v) => seen.push(v),
		});
		menu.items.push(item);
		item.value = 60;
		item.value = 60;
		expect(seen).toEqual([60]);
		expect(menu.changed.length).toBe(1);
	});
});

describe('MenuItem: checkbox', () => {
	test('starts from defaultState and speaks both forms', () => {
		const item = makeItem('checkbox', 'Sound', { defaultState: true });
		expect(item.value).toBe(true);
		expect(item.speak()).toBe('Sound, checked');
		expect(item.speakValue()).toBe('checked');
	});

	test('toggle flips the value and the input', () => {
		const item = makeItem('checkbox', 'Sound', { defaultState: true });
		expect(item.toggle()).toBe(true);
		expect(item.value).toBe(false);
		expect(item.node.querySelector('input').checked).toBe(false);
		expect(item.speakValue()).toBe('unchecked');
	});

	test('adjust toggles in either direction', () => {
		const item = makeItem('checkbox', 'Sound', { defaultState: false });
		expect(item.adjust(1)).toBe(true);
		expect(item.value).toBe(true);
		expect(item.adjust(1)).toBe(true);
		expect(item.value).toBe(false);
	});
});

describe('MenuItem: shared behavior', () => {
	test('rejects an unknown type', () => {
		expect(() => makeItem('nosuchtype', 'x')).toThrow(/unknown menu item type/);
	});

	test('the speak and speakValue options win', () => {
		const item = makeItem('slider', 'Volume', {
			min: 0, max: 10, defaultValue: 5,
			speak: (i) => `custom ${i.value}`,
			speakValue: (i) => `just ${i.value}`,
		});
		expect(item.speak()).toBe('custom 5');
		expect(item.speakValue()).toBe('just 5');
	});

	test('writing the label rebuilds the node through the menu', () => {
		const item = makeItem('text', 'Start');
		const before = item.node;
		item.label = 'Resume';
		expect(item.node).not.toBe(before);
		expect(item.node.textContent).toBe('Resume');
		expect(item.menu.rebuilt).toEqual([item]);
	});

	test('index reports the live position', () => {
		const menu = fakeMenu();
		const first = new MenuItem(menu, 'text', 'One');
		const second = new MenuItem(menu, 'text', 'Two');
		menu.items.push(first, second);
		expect(second.index).toBe(1);
	});
});

import { createMenu } from '../src/ui/menu.js';

// Records what the menu spoke, and with what interrupt flag.
function fakeSpeech() {
	const spoken = [];
	return {
		spoken,
		speak(text, interrupt = false) {
			spoken.push({ text, interrupt });
		},
		last() {
			return spoken.length ? spoken[spoken.length - 1].text : null;
		},
	};
}

function root() {
	const node = document.createElement('div');
	document.body.appendChild(node);
	return node;
}

function setup(options = {}) {
	const speech = fakeSpeech();
	const audio = fakeAudio();
	const menu = createMenu({ root: root(), speech, audio, ...options });
	return { menu, speech, audio };
}

describe('createMenu: construction', () => {
	test('requires a root and a speech instance', () => {
		expect(() => createMenu({ speech: fakeSpeech() })).toThrow(/root/);
		expect(() => createMenu({ root: root() })).toThrow(/speech/);
	});

	test('runs without an audio instance', () => {
		const menu = createMenu({ root: root(), speech: fakeSpeech() });
		menu.addTextItem('Start');
		expect(menu.items.length).toBe(1);
	});
});

describe('createMenu: items', () => {
	test('each builder returns its item and appends by default', () => {
		const { menu } = setup();
		const start = menu.addTextItem('Start');
		const volume = menu.addSlider('Volume', 0, 100, 50);
		const sound = menu.addCheckbox('Sound', true);
		expect(menu.items).toEqual([start, volume, sound]);
		expect(volume.value).toBe(50);
		expect(sound.value).toBe(true);
	});

	test('position inserts at that index', () => {
		const { menu } = setup();
		menu.addTextItem('One');
		menu.addTextItem('Three');
		const two = menu.addTextItem('Two', { position: 1 });
		expect(menu.items[1]).toBe(two);
	});

	test('addItem rejects an unknown type and a duplicate id', () => {
		const { menu } = setup();
		menu.addTextItem('Start', { id: 'start' });
		expect(() => menu.addItem('nosuchtype', 'x')).toThrow(/unknown menu item type/);
		expect(() => menu.addTextItem('Again', { id: 'start' })).toThrow(/duplicate/);
	});

	test('item and value look up by id', () => {
		const { menu } = setup();
		const volume = menu.addSlider('Volume', 0, 100, 50, { id: 'volume' });
		expect(menu.item('volume')).toBe(volume);
		expect(menu.item('nope')).toBe(null);
		expect(menu.value('volume')).toBe(50);
	});

	test('values reports every identified value item', () => {
		const { menu } = setup();
		menu.addTextItem('Start', { id: 'start' });
		menu.addSlider('Volume', 0, 100, 50, { id: 'volume' });
		menu.addCheckbox('Sound', true, { id: 'sound' });
		menu.addCheckbox('Unnamed', false);
		expect(menu.values).toEqual({ volume: 50, sound: true });
	});

	test('deleteItem with resetCursor true moves the cursor to the first item', () => {
		const { menu } = setup();
		menu.addTextItem('One');
		menu.addTextItem('Two');
		menu.addTextItem('Three');
		menu.focusedIndex = 2;
		expect(menu.deleteItem(1)).toBe(true);
		expect(menu.items.length).toBe(2);
		expect(menu.focusedIndex).toBe(0);
	});

	test('deleteItem with resetCursor false keeps the cursor on the same item', () => {
		const { menu } = setup();
		menu.addTextItem('One');
		menu.addTextItem('Two');
		const three = menu.addTextItem('Three');
		menu.focusedIndex = 2;
		menu.deleteItem(0, false);
		expect(menu.focusedItem).toBe(three);
	});

	test('deleteItem at the cursor keeps the index and the node in agreement', () => {
		const { menu } = setup();
		menu.addTextItem('One');
		const two = menu.addTextItem('Two');
		const three = menu.addTextItem('Three');
		menu.focusedIndex = 1;
		menu.deleteItem(1, false);
		expect(menu.focusedItem).toBe(three);
		expect(three.node.classList.contains('focused')).toBe(true);
		expect(two.node.classList.contains('focused')).toBe(false);
	});

	test('deleteItem clamps the cursor when the tail goes away', () => {
		const { menu } = setup();
		menu.addTextItem('One');
		menu.addTextItem('Two');
		menu.focusedIndex = 1;
		menu.deleteItem(1, false);
		expect(menu.focusedIndex).toBe(0);
	});

	test('deleteItem on a missing index returns false', () => {
		const { menu } = setup();
		expect(menu.deleteItem(3)).toBe(false);
	});

	test('deleteAllItems empties the menu and unsets the cursor', () => {
		const { menu } = setup();
		menu.addTextItem('One');
		menu.addTextItem('Two');
		menu.deleteAllItems();
		expect(menu.items).toEqual([]);
		expect(menu.focusedIndex).toBe(-1);
		expect(menu.focusedItem).toBe(null);
	});
});

describe('createMenu: cursor assignment', () => {
	test('focusedItem accepts an item, an index, and an id', () => {
		const { menu, speech } = setup();
		const start = menu.addTextItem('Start');
		const quit = menu.addTextItem('Quit', { id: 'quit' });
		menu.focusedItem = start;
		expect(menu.focusedIndex).toBe(0);
		menu.focusedItem = 1;
		expect(menu.focusedItem).toBe(quit);
		menu.focusedItem = 'quit';
		expect(menu.focusedItem).toBe(quit);
		expect(speech.spoken.length).toBeGreaterThan(0);
		expect(speech.last()).toBe('Quit');
	});

	test('an unknown target unsets the cursor', () => {
		const { menu } = setup();
		menu.addTextItem('Start');
		menu.focusedItem = 'nope';
		expect(menu.focusedIndex).toBe(-1);
	});

	test('the focused item carries the focused class', () => {
		const { menu } = setup();
		const start = menu.addTextItem('Start');
		const quit = menu.addTextItem('Quit');
		menu.focusedItem = start;
		expect(start.node.classList.contains('focused')).toBe(true);
		menu.focusedItem = quit;
		expect(start.node.classList.contains('focused')).toBe(false);
		expect(quit.node.classList.contains('focused')).toBe(true);
	});

	test('a label change keeps the focused class on the new node', () => {
		const { menu } = setup();
		const start = menu.addTextItem('Start');
		menu.focusedItem = start;
		start.label = 'Resume';
		expect(start.node.classList.contains('focused')).toBe(true);
	});
});

import { vi, afterEach } from 'vitest';

// Several tests below install fake timers. Restoring them here rather than at
// the end of each test means a failed assertion cannot leak them into the rest
// of the file.
afterEach(() => {
	vi.useRealTimers();
});

describe('createMenu: movement', () => {
	function threeItems(options = {}) {
		const context = setup(options);
		context.one = context.menu.addTextItem('One');
		context.two = context.menu.addTextItem('Two');
		context.three = context.menu.addTextItem('Three');
		return context;
	}

	test('an unset cursor lands on the first item when moving down', () => {
		const { menu, one, speech } = threeItems({ clickSound: 'click' });
		expect(menu.focusedIndex).toBe(-1);
		menu._move(1);
		expect(menu.focusedItem).toBe(one);
		expect(speech.last()).toBe('One');
	});

	test('an unset cursor lands on the last item when moving up', () => {
		const { menu, three } = threeItems();
		menu._move(-1);
		expect(menu.focusedItem).toBe(three);
	});

	test('moving plays the click sound', () => {
		const { menu, audio } = threeItems({ clickSound: 'click', soundsSuffix: '.ogg' });
		menu._move(1);
		menu._move(1);
		expect(audio.played).toEqual(['click.ogg', 'click.ogg']);
	});

	test('an edge without wrap plays the edge sound and repeats the item', () => {
		const { menu, one, speech, audio } = threeItems({ edgeSound: 'edge', soundsSuffix: '.ogg' });
		menu.focusedItem = one;
		menu._move(-1);
		expect(menu.focusedItem).toBe(one);
		expect(audio.played).toEqual(['edge.ogg']);
		expect(speech.last()).toBe('One');
	});

	test('an edge with wrap jumps to the other end and plays the wrap sound', () => {
		const { menu, one, three, audio } = threeItems({
			wrap: true, wrapSound: 'wrap', soundsSuffix: '.ogg', wrapDelay: 0,
		});
		menu.focusedItem = one;
		menu._move(-1);
		expect(menu.focusedItem).toBe(three);
		expect(audio.played).toEqual(['wrap.ogg']);
	});

	test('movement inside wrapDelay is ignored', () => {
		vi.useFakeTimers();
		const { menu, one, three } = threeItems({ wrap: true, wrapDelay: 50 });
		menu.focusedItem = one;
		menu._move(-1);
		expect(menu.focusedItem).toBe(three);
		menu._move(-1);
		expect(menu.focusedItem).toBe(three);
		vi.advanceTimersByTime(50);
		menu._move(-1);
		expect(menu.focusedItem.label).toBe('Two');
	});

	test('disabled items are skipped and still rendered', () => {
		const { menu } = setup();
		const one = menu.addTextItem('One');
		const two = menu.addTextItem('Two', { disabled: true });
		const three = menu.addTextItem('Three');
		menu.focusedItem = one;
		menu._move(1);
		expect(menu.focusedItem).toBe(three);
		expect(two.node.textContent).toBe('Two');
		expect(two.node.hasAttribute('disabled')).toBe(true);
	});

	test('moving in an empty menu plays the edge sound', () => {
		const { menu, audio } = setup({ edgeSound: 'edge', soundsSuffix: '.ogg' });
		menu._move(1);
		expect(menu.focusedIndex).toBe(-1);
		expect(audio.played).toEqual(['edge.ogg']);
	});

	test('Home and End jump to the ends', () => {
		const { menu, one, three } = threeItems();
		menu._jumpToEnd(-1);
		expect(menu.focusedItem).toBe(three);
		menu._jumpToEnd(1);
		expect(menu.focusedItem).toBe(one);
	});

	test('first letter navigation finds the next match and wraps', () => {
		const { menu } = setup();
		menu.addTextItem('Start');
		menu.addTextItem('Settings');
		menu.addTextItem('Quit');
		menu._jumpToLetter('s');
		expect(menu.focusedItem.label).toBe('Start');
		menu._jumpToLetter('s');
		expect(menu.focusedItem.label).toBe('Settings');
		menu._jumpToLetter('s');
		expect(menu.focusedItem.label).toBe('Start');
	});

	test('first letter navigation ignores a letter with no match', () => {
		const { menu, one } = threeItems();
		menu.focusedItem = one;
		menu._jumpToLetter('z');
		expect(menu.focusedItem).toBe(one);
	});

	test('adjusting speaks the value alone', () => {
		const { menu, speech } = setup();
		const volume = menu.addSlider('Volume', 0, 100, 50, { step: 5 });
		menu.focusedItem = volume;
		expect(speech.last()).toBe('Volume, 50');
		menu._adjustFocused(1);
		expect(volume.value).toBe(55);
		expect(speech.last()).toBe('55');
	});

	test('adjusting past a boundary plays the edge sound', () => {
		const { menu, audio } = setup({ edgeSound: 'edge', soundsSuffix: '.ogg' });
		const volume = menu.addSlider('Volume', 0, 100, 100, { step: 5 });
		menu.focusedItem = volume;
		menu._adjustFocused(1);
		expect(audio.played).toEqual(['edge.ogg']);
	});

	test('a value change on an unfocused item stays silent', () => {
		const { menu, speech } = setup();
		const volume = menu.addSlider('Volume', 0, 100, 50);
		const other = menu.addTextItem('Other');
		menu.focusedItem = other;
		const before = speech.spoken.length;
		volume.value = 70;
		expect(speech.spoken.length).toBe(before);
	});
});
