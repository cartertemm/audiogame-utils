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
