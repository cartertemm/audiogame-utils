import { describe, test, expect, vi } from 'vitest';
import { createBufferManager } from '../src/buffers.js';
import { renderBufferList, renderBufferManager } from '../src/ui/buffers.js';
import * as ui from '../src/ui/index.js';
import * as pkg from '../src/index.js';

function texts(list) {
	return [...list.children].map(node => node.textContent);
}

function currentIndex(list) {
	return [...list.children].findIndex(node => node.classList.contains('current'));
}

function ariaCurrentIndex(list) {
	return [...list.children].findIndex(node => node.getAttribute('aria-current') === 'true');
}

function selectedIndex(list) {
	return [...list.children].findIndex(node => node.getAttribute('aria-selected') === 'true');
}

function press(target, key) {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

describe('renderBufferList', () => {
	test('renders a plain list with one entry per item', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		chat.add('one');
		chat.add('two');
		const list = renderBufferList(chat);
		expect(list.tagName).toBe('UL');
		expect(list.getAttribute('aria-label')).toBe('Chat');
		expect(list.getAttribute('style')).toContain('list-style: none');
		expect(texts(list)).toEqual(['one', 'two']);
		expect(list.children[0].tagName).toBe('LI');
		expect(currentIndex(list)).toBe(0);
		expect(ariaCurrentIndex(list)).toBe(0);
	});

	test('renders an empty buffer as an empty list', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		const list = renderBufferList(chat);
		expect(list.children.length).toBe(0);
	});

	test('does not update without a manager', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		const list = renderBufferList(chat);
		manager.addItem(chat, 'one', { silent: true });
		expect(list.children.length).toBe(0);
	});

	test('appends on add and marks the current item', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		const list = renderBufferList(chat, { manager });
		manager.addItem(chat, 'one', { silent: true });
		manager.addItem(chat, 'two', { silent: true });
		expect(texts(list)).toEqual(['one', 'two']);
		expect(currentIndex(list)).toBe(0);
		expect(selectedIndex(list)).toBe(0);
		expect(list.tabIndex).toBe(-1);
	});

	test('a static list is a plain list', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		chat.add('one');
		const list = renderBufferList(chat);
		expect(list.hasAttribute('role')).toBe(false);
		expect(list.children[0].hasAttribute('role')).toBe(false);
		expect(list.children[0].hasAttribute('tabindex')).toBe(false);
	});

	test('a live list is a listbox with one tab stop on the current option', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		chat.add('one');
		chat.add('two');
		const list = renderBufferList(chat, { manager });
		expect(list.getAttribute('role')).toBe('listbox');
		expect([...list.children].map(node => node.getAttribute('role'))).toEqual(['option', 'option']);
		expect([...list.children].map(node => node.getAttribute('aria-selected'))).toEqual(['true', 'false']);
		expect([...list.children].map(node => node.tabIndex)).toEqual([0, -1]);
		expect(ariaCurrentIndex(list)).toBe(-1);
	});

	test('a live list is a tab stop only while empty', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		const list = renderBufferList(chat, { manager });
		expect(list.tabIndex).toBe(0);
		manager.addItem(chat, 'one', { silent: true });
		expect(list.tabIndex).toBe(-1);
		manager.clearBuffer(chat);
		expect(list.tabIndex).toBe(0);
	});

	test('up and down arrows move silently and focus follows', () => {
		const speech = { speak: vi.fn() };
		const manager = createBufferManager({ speech });
		const chat = manager.createBuffer('Chat');
		chat.add('one');
		chat.add('two');
		const list = renderBufferList(chat, { manager });
		document.body.appendChild(list);
		list.children[0].focus();
		press(list.children[0], 'ArrowDown');
		expect(chat.position).toBe(1);
		expect(selectedIndex(list)).toBe(1);
		expect(document.activeElement).toBe(list.children[1]);
		press(list.children[1], 'ArrowDown');
		expect(chat.position).toBe(1);
		press(list.children[1], 'ArrowUp');
		expect(chat.position).toBe(0);
		expect(document.activeElement).toBe(list.children[0]);
		expect(speech.speak).not.toHaveBeenCalled();
		list.remove();
	});

	test('arrows in a list for another buffer focus that buffer silently', () => {
		const speech = { speak: vi.fn() };
		const manager = createBufferManager({ speech });
		manager.createBuffer('Chat');
		const log = manager.createBuffer('Log');
		log.add('one');
		log.add('two');
		const list = renderBufferList(log, { manager });
		press(list, 'ArrowDown');
		expect(manager.current).toBe(log);
		expect(log.position).toBe(1);
		expect(speech.speak).not.toHaveBeenCalled();
	});

	test('focus stays in the list through clear and the next add', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		chat.add('one');
		const list = renderBufferList(chat, { manager });
		document.body.appendChild(list);
		list.children[0].focus();
		manager.clearBuffer(chat);
		expect(document.activeElement).toBe(list);
		manager.addItem(chat, 'two', { silent: true });
		expect(document.activeElement).toBe(list.children[0]);
		list.remove();
	});

	test('focus moves to the new current item when maxItems drops the focused one', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat', { maxItems: 2 });
		chat.add('one');
		chat.add('two');
		const list = renderBufferList(chat, { manager });
		document.body.appendChild(list);
		list.children[0].focus();
		manager.addItem(chat, 'three', { silent: true });
		expect(document.activeElement).toBe(list.children[chat.position]);
		list.remove();
	});

	test('a maxItems 0 buffer does not throw on addItem and stays empty', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat', { maxItems: 0 });
		const list = renderBufferList(chat, { manager });
		expect(() => manager.addItem(chat, 'one', { silent: true })).not.toThrow();
		expect(list.children.length).toBe(0);
		expect(chat.position).toBe(-1);
	});

	test('drops leading entries when maxItems drops items', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat', { maxItems: 2 });
		const list = renderBufferList(chat, { manager });
		manager.addItem(chat, 'one', { silent: true });
		manager.addItem(chat, 'two', { silent: true });
		manager.nextBufferItem();
		manager.addItem(chat, 'three', { silent: true });
		expect(texts(list)).toEqual(['two', 'three']);
		expect(currentIndex(list)).toBe(0);
	});

	test('follows the cursor on move', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		chat.add('one');
		chat.add('two');
		const list = renderBufferList(chat, { manager });
		manager.nextBufferItem();
		expect(currentIndex(list)).toBe(1);
		manager.previousBufferItem();
		expect(currentIndex(list)).toBe(0);
	});

	test('empties on clear', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		chat.add('one');
		const list = renderBufferList(chat, { manager });
		manager.clearBuffer(chat);
		expect(list.children.length).toBe(0);
	});

	test('ignores events for other buffers', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		const log = manager.createBuffer('Log');
		const list = renderBufferList(chat, { manager });
		manager.addItem(log, 'hit', { silent: true });
		expect(list.children.length).toBe(0);
	});

	test('dispose stops updates', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		const list = renderBufferList(chat, { manager });
		list.dispose();
		manager.addItem(chat, 'one', { silent: true });
		expect(list.children.length).toBe(0);
		expect(manager.listenerCount('add')).toBe(0);
	});

	test('dispose stops arrow keys', () => {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		chat.add('one');
		chat.add('two');
		const list = renderBufferList(chat, { manager });
		list.dispose();
		press(list, 'ArrowDown');
		expect(chat.position).toBe(0);
	});
});

function tabs(root) {
	return [...root.querySelectorAll('[role="tab"]')];
}

function panels(root) {
	return [...root.querySelectorAll('[role="tabpanel"]')];
}

describe('renderBufferManager', () => {
	function setup() {
		const manager = createBufferManager();
		const chat = manager.createBuffer('Chat');
		const log = manager.createBuffer('Log');
		chat.add('hello');
		log.add('hit');
		const root = renderBufferManager(manager);
		document.body.appendChild(root);
		return { manager, chat, log, root };
	}

	test('renders a tablist with one tab and panel per buffer', () => {
		const { root } = setup();
		const tablist = root.querySelector('[role="tablist"]');
		expect(tablist).not.toBeNull();
		expect(tabs(root).map(tab => tab.textContent)).toEqual(['Chat', 'Log']);
		expect(tabs(root).every(tab => tab.tagName === 'BUTTON' && tab.getAttribute('type') === 'button')).toBe(true);
		expect(panels(root).length).toBe(2);
		expect(panels(root)[0].querySelector('ul').getAttribute('aria-label')).toBe('Chat');
		expect(panels(root)[0].querySelector('li').textContent).toBe('hello');
		expect(panels(root).every(panel => !panel.hasAttribute('tabindex'))).toBe(true);
	});

	test('connects tabs and panels with ids', () => {
		const { root } = setup();
		const [tab] = tabs(root);
		const [panel] = panels(root);
		expect(tab.id).toBeTruthy();
		expect(panel.id).toBeTruthy();
		expect(tab.getAttribute('aria-controls')).toBe(panel.id);
		expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
	});

	test('two controls on one page get different ids', () => {
		const { manager, root } = setup();
		const second = renderBufferManager(manager);
		expect(tabs(second)[0].id).not.toBe(tabs(root)[0].id);
	});

	test('selects the focused buffer', () => {
		const { manager, root } = setup();
		expect(tabs(root).map(tab => tab.getAttribute('aria-selected'))).toEqual(['true', 'false']);
		expect(tabs(root).map(tab => tab.tabIndex)).toEqual([0, -1]);
		expect(panels(root).map(panel => panel.hidden)).toEqual([false, true]);
		manager.nextBuffer({ silent: true });
		expect(tabs(root).map(tab => tab.getAttribute('aria-selected'))).toEqual(['false', 'true']);
		expect(tabs(root).map(tab => tab.tabIndex)).toEqual([-1, 0]);
		expect(panels(root).map(panel => panel.hidden)).toEqual([true, false]);
	});

	test('clicking a tab focuses that buffer silently', () => {
		const speech = { speak: vi.fn() };
		const manager = createBufferManager({ speech });
		manager.createBuffer('Chat');
		const log = manager.createBuffer('Log');
		const root = renderBufferManager(manager);
		tabs(root)[1].click();
		expect(manager.current).toBe(log);
		expect(speech.speak).not.toHaveBeenCalled();
	});

	test('arrow keys move between tabs and wrap', () => {
		const { manager, root, chat, log } = setup();
		const tablist = root.querySelector('[role="tablist"]');
		tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		expect(manager.current).toBe(log);
		expect(document.activeElement).toBe(tabs(root)[1]);
		tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		expect(manager.current).toBe(chat);
		tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
		expect(manager.current).toBe(log);
	});

	test('adds and removes tabs with the manager', () => {
		const { manager, root } = setup();
		manager.createBuffer('System');
		expect(tabs(root).map(tab => tab.textContent)).toEqual(['Chat', 'Log', 'System']);
		expect(panels(root).length).toBe(3);
		manager.deleteBuffer('Chat');
		expect(tabs(root).map(tab => tab.textContent)).toEqual(['Log', 'System']);
		expect(panels(root).length).toBe(2);
		expect(tabs(root).map(tab => tab.getAttribute('aria-selected'))).toEqual(['true', 'false']);
	});

	test('lists inside panels stay live', () => {
		const { manager, chat, root } = setup();
		manager.addItem(chat, 'again', { silent: true });
		expect([...panels(root)[0].querySelectorAll('li')].map(li => li.textContent)).toEqual(['hello', 'again']);
	});

	test('dispose stops tab clicks and arrow keys from driving the manager', () => {
		const { manager, chat, root } = setup();
		const tablist = root.querySelector('[role="tablist"]');
		root.dispose();
		tabs(root)[1].click();
		tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		expect(manager.current).toBe(chat);
	});

	test('dispose unsubscribes everything', () => {
		const { manager, chat, root } = setup();
		root.dispose();
		manager.createBuffer('System');
		manager.addItem(chat, 'again', { silent: true });
		expect(tabs(root).length).toBe(2);
		expect(panels(root)[0].querySelectorAll('li').length).toBe(1);
		for (const name of ['create', 'delete', 'focus', 'add', 'clear', 'move']) {
			expect(manager.listenerCount(name)).toBe(0);
		}
	});

	test('renders with no buffers and does not throw on arrow keys', () => {
		const manager = createBufferManager();
		const root = renderBufferManager(manager);
		document.body.appendChild(root);
		const tablist = root.querySelector('[role="tablist"]');
		expect(tabs(root).length).toBe(0);
		expect(panels(root).length).toBe(0);
		expect(() => tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))).not.toThrow();
	});
});

describe('exports', () => {
	test('render functions are exported from ui and the root', () => {
		expect(ui.renderBufferList).toBe(renderBufferList);
		expect(ui.renderBufferManager).toBe(renderBufferManager);
		expect(pkg.renderBufferList).toBe(renderBufferList);
		expect(pkg.renderBufferManager).toBe(renderBufferManager);
	});
});
