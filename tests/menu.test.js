import { describe, test, expect } from 'vitest';
import { createMenuSounds } from '../src/ui/menuSounds.js';
import * as pkg from '../src/index.js';
import * as ui from '../src/ui/index.js';

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
	const rootNode = root();
	const speech = fakeSpeech();
	const audio = fakeAudio();
	const menu = createMenu({ root: rootNode, speech, audio, ...options });
	return { menu, speech, audio, rootNode };
}

// Drives the menu the way a real keydown would, so movement and keyboard
// tests both exercise onKeyDown's key mapping and the `running` guard rather
// than calling the internal move functions directly.
function press(rootNode, key) {
	const container = rootNode.querySelector('.menu');
	const event = new Event('keydown', { bubbles: true, cancelable: true });
	event.key = key;
	container.dispatchEvent(event);
	return event;
}

function pressWithModifier(rootNode, key, modifiers) {
	const container = rootNode.querySelector('.menu');
	const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...modifiers });
	container.dispatchEvent(event);
	return event;
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

	test('focusedIndex rejects a non-number', () => {
		const { menu } = setup();
		menu.addTextItem('Start');
		menu.addTextItem('Quit', { id: 'quit' });
		expect(() => { menu.focusedIndex = 'quit'; }).toThrow(TypeError);
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

	test('moving the cursor scrolls the focused node into view', () => {
		const { menu } = setup();
		const start = menu.addTextItem('Start');
		const quit = menu.addTextItem('Quit');
		const calls = [];
		start.node.scrollIntoView = (opts) => calls.push(opts);
		quit.node.scrollIntoView = (opts) => calls.push(opts);
		menu.focusedItem = start;
		expect(calls).toEqual([{ block: 'nearest' }]);
		menu.focusedItem = quit;
		expect(calls).toEqual([{ block: 'nearest' }, { block: 'nearest' }]);
	});

	test('setFocus does not throw when scrollIntoView is missing', () => {
		const { menu } = setup();
		const start = menu.addTextItem('Start');
		start.node.scrollIntoView = undefined;
		expect(() => { menu.focusedItem = start; }).not.toThrow();
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
	// Movement has no dedicated API of its own now: it is driven the same way a
	// player drives it, through dispatched key events on a running menu. That
	// exercises onKeyDown's key mapping and the `running` guard, not just the
	// move logic underneath.
	async function threeItems(options = {}) {
		const rootNode = root();
		const speech = fakeSpeech();
		const audio = fakeAudio();
		const menu = createMenu({ root: rootNode, speech, audio, ...options });
		const one = menu.addTextItem('One');
		const two = menu.addTextItem('Two');
		const three = menu.addTextItem('Three');
		const pending = menu.run();
		return { rootNode, menu, speech, audio, one, two, three, pending };
	}

	async function finish(context) {
		context.menu.close();
		await context.pending;
	}

	test('an unset cursor lands on the first item when moving down', async () => {
		const context = await threeItems({ clickSound: 'click' });
		expect(context.menu.focusedIndex).toBe(-1);
		press(context.rootNode, 'ArrowDown');
		expect(context.menu.focusedItem).toBe(context.one);
		expect(context.speech.last()).toBe('One');
		await finish(context);
	});

	test('an unset cursor lands on the last item when moving up', async () => {
		const context = await threeItems();
		press(context.rootNode, 'ArrowUp');
		expect(context.menu.focusedItem).toBe(context.three);
		await finish(context);
	});

	test('moving plays the click sound', async () => {
		const context = await threeItems({ clickSound: 'click', soundsSuffix: '.ogg' });
		press(context.rootNode, 'ArrowDown');
		press(context.rootNode, 'ArrowDown');
		expect(context.audio.played).toEqual(['click.ogg', 'click.ogg']);
		await finish(context);
	});

	test('an edge without wrap plays the edge sound and repeats the item', async () => {
		const context = await threeItems({ edgeSound: 'edge', soundsSuffix: '.ogg' });
		context.menu.focusedItem = context.one;
		press(context.rootNode, 'ArrowUp');
		expect(context.menu.focusedItem).toBe(context.one);
		expect(context.audio.played).toEqual(['edge.ogg']);
		expect(context.speech.last()).toBe('One');
		await finish(context);
	});

	test('an edge with wrap jumps to the other end and plays the wrap sound', async () => {
		const context = await threeItems({
			wrap: true, wrapSound: 'wrap', soundsSuffix: '.ogg', wrapDelay: 0,
		});
		context.menu.focusedItem = context.one;
		press(context.rootNode, 'ArrowUp');
		expect(context.menu.focusedItem).toBe(context.three);
		expect(context.audio.played).toEqual(['wrap.ogg']);
		await finish(context);
	});

	test('movement inside wrapDelay is ignored', async () => {
		vi.useFakeTimers();
		const context = await threeItems({ wrap: true, wrapDelay: 50 });
		context.menu.focusedItem = context.one;
		press(context.rootNode, 'ArrowUp');
		expect(context.menu.focusedItem).toBe(context.three);
		press(context.rootNode, 'ArrowUp');
		expect(context.menu.focusedItem).toBe(context.three);
		vi.advanceTimersByTime(50);
		press(context.rootNode, 'ArrowUp');
		expect(context.menu.focusedItem.label).toBe('Two');
		await finish(context);
	});

	test('disabled items are skipped and still rendered', async () => {
		const rootNode = root();
		const menu = createMenu({ root: rootNode, speech: fakeSpeech() });
		const one = menu.addTextItem('One');
		const two = menu.addTextItem('Two', { disabled: true });
		const three = menu.addTextItem('Three');
		const pending = menu.run();
		menu.focusedItem = one;
		press(rootNode, 'ArrowDown');
		expect(menu.focusedItem).toBe(three);
		expect(two.node.textContent).toBe('Two');
		expect(two.node.hasAttribute('disabled')).toBe(true);
		menu.close();
		await pending;
	});

	test('a cursor on a disabled item moves to the adjacent enabled item, moving down', async () => {
		const rootNode = root();
		const menu = createMenu({ root: rootNode, speech: fakeSpeech() });
		menu.addTextItem('One');
		const two = menu.addTextItem('Two', { disabled: true });
		const three = menu.addTextItem('Three');
		const pending = menu.run();
		menu.focusedIndex = 1;
		expect(menu.focusedItem).toBe(two);
		press(rootNode, 'ArrowDown');
		expect(menu.focusedItem).toBe(three);
		menu.close();
		await pending;
	});

	test('a cursor on a disabled item moves to the adjacent enabled item, moving up', async () => {
		const rootNode = root();
		const menu = createMenu({ root: rootNode, speech: fakeSpeech() });
		const one = menu.addTextItem('One');
		const two = menu.addTextItem('Two', { disabled: true });
		menu.addTextItem('Three');
		const pending = menu.run();
		menu.focusedIndex = 1;
		expect(menu.focusedItem).toBe(two);
		press(rootNode, 'ArrowUp');
		expect(menu.focusedItem).toBe(one);
		menu.close();
		await pending;
	});

	test('moving in an empty menu plays the edge sound', async () => {
		const rootNode = root();
		const audio = fakeAudio();
		const menu = createMenu({ root: rootNode, speech: fakeSpeech(), audio, edgeSound: 'edge', soundsSuffix: '.ogg' });
		const pending = menu.run();
		press(rootNode, 'ArrowDown');
		expect(menu.focusedIndex).toBe(-1);
		expect(audio.played).toEqual(['edge.ogg']);
		menu.close();
		await pending;
	});

	test('Home and End jump to the ends', async () => {
		const context = await threeItems();
		press(context.rootNode, 'End');
		expect(context.menu.focusedItem).toBe(context.three);
		press(context.rootNode, 'Home');
		expect(context.menu.focusedItem).toBe(context.one);
		await finish(context);
	});

	test('first letter navigation finds the next match and wraps', async () => {
		const rootNode = root();
		const menu = createMenu({ root: rootNode, speech: fakeSpeech() });
		menu.addTextItem('Start');
		menu.addTextItem('Settings');
		menu.addTextItem('Quit');
		const pending = menu.run();
		press(rootNode, 's');
		expect(menu.focusedItem.label).toBe('Start');
		press(rootNode, 's');
		expect(menu.focusedItem.label).toBe('Settings');
		press(rootNode, 's');
		expect(menu.focusedItem.label).toBe('Start');
		menu.close();
		await pending;
	});

	test('first letter navigation ignores a letter with no match', async () => {
		const context = await threeItems();
		context.menu.focusedItem = context.one;
		press(context.rootNode, 'z');
		expect(context.menu.focusedItem).toBe(context.one);
		await finish(context);
	});

	test('adjusting speaks the value alone', async () => {
		const rootNode = root();
		const speech = fakeSpeech();
		const menu = createMenu({ root: rootNode, speech });
		const volume = menu.addSlider('Volume', 0, 100, 50, { step: 5 });
		const pending = menu.run();
		menu.focusedItem = volume;
		expect(speech.last()).toBe('Volume, 50');
		press(rootNode, 'ArrowRight');
		expect(volume.value).toBe(55);
		expect(speech.last()).toBe('55');
		menu.close();
		await pending;
	});

	test('adjusting past a boundary plays the edge sound', async () => {
		const rootNode = root();
		const audio = fakeAudio();
		const menu = createMenu({ root: rootNode, speech: fakeSpeech(), audio, edgeSound: 'edge', soundsSuffix: '.ogg' });
		const volume = menu.addSlider('Volume', 0, 100, 100, { step: 5 });
		const pending = menu.run();
		menu.focusedItem = volume;
		press(rootNode, 'ArrowRight');
		expect(audio.played).toEqual(['edge.ogg']);
		menu.close();
		await pending;
	});

	test('a value change on an unfocused item stays silent', async () => {
		const context = await threeItems();
		const volume = context.menu.addSlider('Volume', 0, 100, 50);
		context.menu.focusedItem = context.one;
		const before = context.speech.spoken.length;
		volume.value = 70;
		expect(context.speech.spoken.length).toBe(before);
		await finish(context);
	});
});

describe('createMenu: run and close', () => {
	test('run mounts a container, plays the open sound, and speaks the intro', async () => {
		const rootNode = root();
		const speech = fakeSpeech();
		const audio = fakeAudio();
		const menu = createMenu({
			root: rootNode, speech, audio,
			introText: 'Main menu', openSound: 'open', soundsSuffix: '.ogg',
		});
		menu.addTextItem('Start');
		const pending = menu.run();
		expect(rootNode.querySelector('.menu')).not.toBe(null);
		expect(rootNode.querySelector('.menu-items').getAttribute('aria-hidden')).toBe('true');
		expect(audio.played).toEqual(['open.ogg']);
		expect(speech.spoken[0].text).toBe('Main menu');
		menu.close();
		expect(await pending).toBe(null);
	});

	test('focusFirstItem speaks the intro and the first item as one utterance', async () => {
		const { menu, speech } = setup({ introText: 'Main menu', focusFirstItem: true });
		menu.addTextItem('Start');
		const pending = menu.run();
		expect(speech.spoken[0].text).toBe('Main menu. Start');
		expect(menu.focusedIndex).toBe(0);
		menu.close();
		await pending;
	});

	test('without focusFirstItem the cursor stays unset', async () => {
		const { menu } = setup({ introText: 'Main menu' });
		menu.addTextItem('Start');
		const pending = menu.run();
		expect(menu.focusedIndex).toBe(-1);
		menu.close();
		await pending;
	});

	test('the container gets role application and an aria-label', async () => {
		const rootNode = root();
		const menu = createMenu({ root: rootNode, speech: fakeSpeech(), label: 'Main menu' });
		menu.addTextItem('Start');
		const pending = menu.run();
		const container = rootNode.querySelector('.menu');
		expect(container.getAttribute('role')).toBe('application');
		expect(container.getAttribute('aria-label')).toBe('Main menu');
		menu.close();
		await pending;
	});

	test('an existing application ancestor is reused and left alone', async () => {
		const rootNode = root();
		rootNode.setAttribute('role', 'application');
		const menu = createMenu({ root: rootNode, speech: fakeSpeech() });
		menu.addTextItem('Start');
		const pending = menu.run();
		const container = rootNode.querySelector('.menu');
		expect(container.getAttribute('role')).toBe(null);
		menu.close();
		await pending;
		expect(rootNode.getAttribute('role')).toBe('application');
	});

	test('activating a text item resolves with that item and leaves the menu mounted', async () => {
		const rootNode = root();
		const audio = fakeAudio();
		const menu = createMenu({
			root: rootNode, speech: fakeSpeech(), audio,
			selectSound: 'select', soundsSuffix: '.ogg',
		});
		const start = menu.addTextItem('Start');
		const pending = menu.run();
		menu.focusedItem = start;
		press(rootNode, 'Enter');
		expect(await pending).toBe(start);
		expect(rootNode.querySelector('.menu')).not.toBe(null);
		expect(audio.played).toContain('select.ogg');
		menu.close();
	});

	test('a second run resumes without a second intro', async () => {
		const { menu, speech, rootNode } = setup({ introText: 'Main menu' });
		const start = menu.addTextItem('Start');
		const first = menu.run();
		menu.focusedItem = start;
		press(rootNode, 'Enter');
		await first;
		const introCount = speech.spoken.filter(entry => entry.text === 'Main menu').length;
		const second = menu.run();
		expect(speech.spoken.filter(entry => entry.text === 'Main menu').length).toBe(introCount);
		menu.close();
		await second;
	});

	test('close plays the close sound, removes the container, and resolves null', async () => {
		const rootNode = root();
		const audio = fakeAudio();
		const menu = createMenu({
			root: rootNode, speech: fakeSpeech(), audio,
			closeSound: 'close', soundsSuffix: '.ogg',
		});
		menu.addTextItem('Start');
		const pending = menu.run();
		menu.close();
		expect(await pending).toBe(null);
		expect(rootNode.querySelector('.menu')).toBe(null);
		expect(audio.played).toEqual(['close.ogg']);
	});

	test('close leaves the rest of the root alone', async () => {
		const rootNode = root();
		rootNode.appendChild(document.createElement('h1'));
		const menu = createMenu({ root: rootNode, speech: fakeSpeech() });
		menu.addTextItem('Start');
		const pending = menu.run();
		menu.close();
		await pending;
		expect(rootNode.querySelector('h1')).not.toBe(null);
	});

	test('close is idempotent', async () => {
		const { menu } = setup();
		menu.addTextItem('Start');
		const pending = menu.run();
		menu.close();
		await pending;
		expect(() => menu.close()).not.toThrow();
	});

	test('reopening keeps the items and their values', async () => {
		const { menu } = setup();
		const volume = menu.addSlider('Volume', 0, 100, 50);
		const first = menu.run();
		volume.value = 80;
		menu.close();
		await first;
		const second = menu.run();
		expect(menu.items).toEqual([volume]);
		expect(volume.value).toBe(80);
		expect(volume.node.isConnected).toBe(true);
		menu.close();
		await second;
	});

	test('a concurrent run throws', async () => {
		const { menu } = setup();
		menu.addTextItem('Start');
		const pending = menu.run();
		expect(() => menu.run()).toThrow(/already pending/);
		menu.close();
		await pending;
	});

	test('an empty menu still opens and closes', async () => {
		const { menu, rootNode } = setup({ introText: 'Empty' });
		const pending = menu.run();
		press(rootNode, 'ArrowDown');
		menu.close();
		expect(await pending).toBe(null);
	});
});

describe('createMenu: keyboard', () => {
	async function keyboardMenu(options = {}) {
		const rootNode = root();
		const speech = fakeSpeech();
		const audio = fakeAudio();
		const menu = createMenu({ root: rootNode, speech, audio, ...options });
		const start = menu.addTextItem('Start');
		const volume = menu.addSlider('Volume', 0, 100, 50, { step: 5 });
		const sound = menu.addCheckbox('Sound', true);
		const quit = menu.addTextItem('Quit');
		const pending = menu.run();
		return { rootNode, menu, speech, audio, start, volume, sound, quit, pending };
	}

	test('ArrowDown and ArrowUp move the cursor', async () => {
		const context = await keyboardMenu();
		press(context.rootNode, 'ArrowDown');
		expect(context.menu.focusedItem).toBe(context.start);
		press(context.rootNode, 'ArrowDown');
		expect(context.menu.focusedItem).toBe(context.volume);
		press(context.rootNode, 'ArrowUp');
		expect(context.menu.focusedItem).toBe(context.start);
		context.menu.close();
		await context.pending;
	});

	test('ArrowRight and ArrowLeft move a slider and speak the value alone', async () => {
		const context = await keyboardMenu();
		context.menu.focusedItem = context.volume;
		press(context.rootNode, 'ArrowRight');
		expect(context.volume.value).toBe(55);
		expect(context.speech.last()).toBe('55');
		press(context.rootNode, 'ArrowLeft');
		expect(context.volume.value).toBe(50);
		context.menu.close();
		await context.pending;
	});

	test('Space toggles a checkbox and does not resolve', async () => {
		const context = await keyboardMenu();
		context.menu.focusedItem = context.sound;
		press(context.rootNode, ' ');
		expect(context.sound.value).toBe(false);
		expect(context.speech.last()).toBe('unchecked');
		context.menu.close();
		expect(await context.pending).toBe(null);
	});

	test('Enter toggles a checkbox rather than resolving', async () => {
		const context = await keyboardMenu();
		context.menu.focusedItem = context.sound;
		press(context.rootNode, 'Enter');
		expect(context.sound.value).toBe(false);
		context.menu.close();
		expect(await context.pending).toBe(null);
	});

	test('Enter on a slider plays the edge sound and does not resolve', async () => {
		const context = await keyboardMenu({ edgeSound: 'edge', soundsSuffix: '.ogg' });
		context.menu.focusedItem = context.volume;
		press(context.rootNode, 'Enter');
		expect(context.audio.played).toContain('edge.ogg');
		context.menu.close();
		expect(await context.pending).toBe(null);
	});

	test('Enter on a text item resolves with that item', async () => {
		const context = await keyboardMenu();
		context.menu.focusedItem = context.quit;
		press(context.rootNode, 'Enter');
		expect(await context.pending).toBe(context.quit);
		context.menu.close();
	});

	test('Home and End jump to the ends', async () => {
		const context = await keyboardMenu();
		press(context.rootNode, 'End');
		expect(context.menu.focusedItem).toBe(context.quit);
		press(context.rootNode, 'Home');
		expect(context.menu.focusedItem).toBe(context.start);
		context.menu.close();
		await context.pending;
	});

	test('Escape closes and resolves null', async () => {
		const context = await keyboardMenu({ closeSound: 'close', soundsSuffix: '.ogg' });
		press(context.rootNode, 'Escape');
		expect(await context.pending).toBe(null);
		expect(context.rootNode.querySelector('.menu')).toBe(null);
		expect(context.audio.played).toContain('close.ogg');
	});

	test('a letter jumps to the matching item', async () => {
		const context = await keyboardMenu();
		press(context.rootNode, 'q');
		expect(context.menu.focusedItem).toBe(context.quit);
		context.menu.close();
		await context.pending;
	});

	test('a letter with a modifier key does not jump', async () => {
		const context = await keyboardMenu();
		const event = pressWithModifier(context.rootNode, 'r', { ctrlKey: true });
		expect(context.menu.focusedIndex).toBe(-1);
		expect(event.defaultPrevented).toBe(false);
		context.menu.close();
		await context.pending;
	});

	test('firstLetterNavigation false ignores letters', async () => {
		const context = await keyboardMenu({ firstLetterNavigation: false });
		press(context.rootNode, 'q');
		expect(context.menu.focusedIndex).toBe(-1);
		context.menu.close();
		await context.pending;
	});

	test('Tab is prevented and does not move focus out of the container', async () => {
		const context = await keyboardMenu();
		const container = context.rootNode.querySelector('.menu');
		const event = press(context.rootNode, 'Tab');
		expect(event.defaultPrevented).toBe(true);
		expect(container.contains(document.activeElement)).toBe(true);
		context.menu.close();
		await context.pending;
	});

	// The trap swallows Tab on its own, so the menu only handles it when it
	// attached to an application ancestor it does not own.
	test('Tab is prevented when the menu did not create the trap', async () => {
		const rootNode = root();
		rootNode.setAttribute('role', 'application');
		const menu = createMenu({ root: rootNode, speech: fakeSpeech() });
		menu.addTextItem('Start');
		const pending = menu.run();
		expect(press(rootNode, 'Tab').defaultPrevented).toBe(true);
		menu.close();
		await pending;
	});

	test('handled keys are prevented', async () => {
		const context = await keyboardMenu();
		expect(press(context.rootNode, 'ArrowDown').defaultPrevented).toBe(true);
		expect(press(context.rootNode, 'F5').defaultPrevented).toBe(false);
		context.menu.close();
		await context.pending;
	});

	test('keys do nothing after close', async () => {
		const context = await keyboardMenu();
		const container = context.rootNode.querySelector('.menu');
		context.menu.close();
		await context.pending;
		const event = new Event('keydown', { bubbles: true, cancelable: true });
		event.key = 'ArrowDown';
		expect(() => container.dispatchEvent(event)).not.toThrow();
		expect(context.menu.focusedIndex).toBe(-1);
	});
});

describe('createMenu: pointer', () => {
	function hover(node) {
		node.dispatchEvent(new Event('mouseenter', { bubbles: true }));
	}

	test('hovering moves the cursor and plays the click sound', async () => {
		const { menu, audio, speech } = setup({ clickSound: 'click', soundsSuffix: '.ogg' });
		menu.addTextItem('Start');
		const quit = menu.addTextItem('Quit');
		const pending = menu.run();
		hover(quit.node);
		expect(menu.focusedItem).toBe(quit);
		expect(speech.last()).toBe('Quit');
		expect(audio.played).toContain('click.ogg');
		menu.close();
		await pending;
	});

	test('hovering the focused item does not re-announce', async () => {
		const { menu, speech } = setup();
		const start = menu.addTextItem('Start');
		const pending = menu.run();
		menu.focusedItem = start;
		const before = speech.spoken.length;
		hover(start.node);
		expect(speech.spoken.length).toBe(before);
		menu.close();
		await pending;
	});

	test('clicking a text item resolves with it', async () => {
		const { menu } = setup();
		menu.addTextItem('Start');
		const quit = menu.addTextItem('Quit');
		const pending = menu.run();
		quit.node.click();
		expect(await pending).toBe(quit);
		menu.close();
	});

	test('clicking a checkbox toggles once, not twice', async () => {
		const { menu } = setup();
		const sound = menu.addCheckbox('Sound', true);
		const pending = menu.run();
		sound.node.querySelector('input').click();
		expect(sound.value).toBe(false);
		menu.close();
		await pending;
	});

	test('clicking an unfocused checkbox speaks only the new value, not the stale one', async () => {
		const { menu, speech } = setup();
		menu.addTextItem('Start');
		const sound = menu.addCheckbox('Sound', true);
		const pending = menu.run();
		const input = sound.node.querySelector('input');
		// happy-dom's native .click() fires change before the click event finishes
		// bubbling, the opposite of a real browser. Dispatch by hand so the order
		// matches what actually happens in a browser: checkedness flips, click
		// bubbles, and only then does change fire.
		input.checked = false;
		input.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
		input.dispatchEvent(new Event('change', { bubbles: true }));
		expect(speech.spoken.map(entry => entry.text)).not.toContain('Sound, checked');
		expect(speech.last()).toBe('unchecked');
		menu.close();
		await pending;
	});

	test('a disabled item ignores the pointer', async () => {
		const { menu } = setup();
		const start = menu.addTextItem('Start', { disabled: true });
		const pending = menu.run();
		hover(start.node);
		start.node.click();
		expect(menu.focusedIndex).toBe(-1);
		menu.close();
		await pending;
	});

	test('the pointer does nothing before run', () => {
		const { menu } = setup();
		const start = menu.addTextItem('Start');
		hover(start.node);
		expect(menu.focusedIndex).toBe(-1);
	});

	test('a rebuilt node keeps its pointer handlers', async () => {
		const { menu } = setup();
		const start = menu.addTextItem('Start');
		const pending = menu.run();
		start.label = 'Resume';
		hover(start.node);
		expect(menu.focusedItem).toBe(start);
		menu.close();
		await pending;
	});
});

describe('createMenu: touch', () => {
	// Drives the real createTouch through synthetic events, matching
	// tests/touch.test.js.
	function makeTouch(id, x, y) {
		return { identifier: id, clientX: x, clientY: y };
	}

	function dispatchTouch(node, type, touches, changedTouches) {
		const event = new Event(type, { bubbles: true, cancelable: true });
		event.touches = touches;
		event.changedTouches = changedTouches ?? touches;
		event.preventDefault = () => {};
		node.dispatchEvent(event);
	}

	function swipe(node, direction) {
		const moves = {
			left: [200, 100, 100, 100],
			right: [100, 100, 200, 100],
			up: [100, 200, 100, 100],
			down: [100, 100, 100, 200],
		};
		const [x1, y1, x2, y2] = moves[direction];
		dispatchTouch(node, 'touchstart', [makeTouch(1, x1, y1)]);
		dispatchTouch(node, 'touchmove', [makeTouch(1, x2, y2)]);
		dispatchTouch(node, 'touchend', [], [makeTouch(1, x2, y2)]);
	}

	function tap(node, fingers, times) {
		const points = Array.from({ length: fingers }, (_, i) => makeTouch(i + 1, 100 + i * 50, 100));
		for (let n = 0; n < times; n += 1) {
			dispatchTouch(node, 'touchstart', points);
			dispatchTouch(node, 'touchend', [], points);
		}
	}

	async function touchMenu(options = {}) {
		const rootNode = root();
		const speech = fakeSpeech();
		const menu = createMenu({ root: rootNode, speech, multiTapWindow: 20, ...options });
		const start = menu.addTextItem('Start');
		const volume = menu.addSlider('Volume', 0, 100, 50, { step: 5 });
		const pending = menu.run();
		const container = rootNode.querySelector('.menu');
		return { rootNode, container, menu, speech, start, volume, pending };
	}

	test('swipe right and left move the cursor', async () => {
		const context = await touchMenu();
		swipe(context.container, 'right');
		expect(context.menu.focusedItem).toBe(context.start);
		swipe(context.container, 'right');
		expect(context.menu.focusedItem).toBe(context.volume);
		swipe(context.container, 'left');
		expect(context.menu.focusedItem).toBe(context.start);
		context.menu.close();
		await context.pending;
	});

	test('swipe down and up change a value', async () => {
		const context = await touchMenu();
		context.menu.focusedItem = context.volume;
		swipe(context.container, 'down');
		expect(context.volume.value).toBe(55);
		expect(context.speech.last()).toBe('55');
		swipe(context.container, 'up');
		expect(context.volume.value).toBe(50);
		context.menu.close();
		await context.pending;
	});

	test('a double tap activates the focused item', async () => {
		vi.useFakeTimers();
		const context = await touchMenu();
		context.menu.focusedItem = context.start;
		tap(context.container, 1, 2);
		vi.advanceTimersByTime(300);
		vi.useRealTimers();
		expect(await context.pending).toBe(context.start);
		context.menu.close();
	});

	test('a single tap does nothing', async () => {
		vi.useFakeTimers();
		const context = await touchMenu();
		context.menu.focusedItem = context.start;
		tap(context.container, 1, 1);
		vi.advanceTimersByTime(300);
		vi.useRealTimers();
		expect(context.menu.focusedItem).toBe(context.start);
		context.menu.close();
		expect(await context.pending).toBe(null);
	});

	test('a two finger tap closes the menu', async () => {
		vi.useFakeTimers();
		const context = await touchMenu();
		tap(context.container, 2, 1);
		vi.advanceTimersByTime(300);
		vi.useRealTimers();
		expect(await context.pending).toBe(null);
		expect(context.rootNode.querySelector('.menu')).toBe(null);
	});

	test('gestures stop after close', async () => {
		const context = await touchMenu();
		const container = context.container;
		context.menu.close();
		await context.pending;
		expect(() => swipe(container, 'right')).not.toThrow();
		expect(context.menu.focusedIndex).toBe(-1);
	});
});

describe('menu exports', () => {
	test('createMenu and MenuItem are exported from the package root', () => {
		expect(typeof pkg.createMenu).toBe('function');
		expect(typeof pkg.MenuItem).toBe('function');
	});

	test('createMenu and MenuItem are exported from the ui entry point', () => {
		expect(typeof ui.createMenu).toBe('function');
		expect(typeof ui.MenuItem).toBe('function');
	});
});
