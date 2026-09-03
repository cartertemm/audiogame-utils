import { describe, test, expect, vi } from 'vitest';
import { createRouter, el, mount } from '../src/ui/index.js';

function root() {
	const node = document.createElement('div');
	document.body.appendChild(node);
	return node;
}

function escape(target = document) {
	const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
	target.dispatchEvent(event);
	return event;
}

// A menu whose buttons carry no id, which is what games actually build.
function menu(node, props = {}) {
	mount(node, [
		el('h1', { text: props.title ?? 'Menu' }),
		el('button', { type: 'button', text: 'First', autoFocus: true }),
		el('button', { type: 'button', text: 'Second' }),
	]);
}

function settings(node) {
	mount(node, [el('input', { id: 'field-name', type: 'text', autoFocus: true })]);
}

describe('ui: createRouter', () => {
	test('renders a screen and passes props', () => {
		const node = root();
		const router = createRouter({ root: node });
		router.go(menu, { title: 'Main menu' });
		expect(node.querySelector('h1').textContent).toBe('Main menu');
		expect(router.depth).toBe(1);
		expect(router.current).toBe(menu);
	});

	test('runs screen cleanup when leaving, going back, replacing, and disposing', () => {
		const node = root();
		const cleanup = vi.fn();
		const screen = () => cleanup;
		const router = createRouter({ root: node });

		router.go(screen);
		router.go(menu);
		expect(cleanup).toHaveBeenCalledTimes(1);

		router.back();
		router.replace(menu);
		expect(cleanup).toHaveBeenCalledTimes(2);

		router.go(screen);
		router.dispose();
		expect(cleanup).toHaveBeenCalledTimes(3);
	});

	test('re-renders the previous screen with the props it was given', () => {
		const node = root();
		const router = createRouter({ root: node });
		router.go(menu, { title: 'Main menu' });
		router.go(settings);
		expect(node.querySelector('#field-name')).not.toBe(null);

		expect(router.back()).toBe(true);
		expect(node.querySelector('h1').textContent).toBe('Main menu');
		expect(router.depth).toBe(1);
	});

	test('does nothing at the root', () => {
		const node = root();
		const router = createRouter({ root: node });
		router.go(menu);
		expect(router.back()).toBe(false);
		expect(router.depth).toBe(1);
		expect(node.querySelector('h1')).not.toBe(null);
	});

	test('restores focus to the control it left by id', () => {
		const node = root();
		const router = createRouter({ root: node });
		router.go(settings);
		router.go(menu);
		router.back();
		expect(document.activeElement.id).toBe('field-name');
	});

	test('restores focus by position when the control has no id', () => {
		const node = root();
		const router = createRouter({ root: node });
		router.go(menu);
		const second = node.querySelectorAll('button')[1];
		second.focus();

		router.go(settings);
		router.back();
		expect(document.activeElement.textContent).toBe('Second');
	});

	test('replaces without growing the stack', () => {
		const node = root();
		const router = createRouter({ root: node });
		router.go(menu, { title: 'First' });
		router.replace(menu, { title: 'Second' });
		expect(router.depth).toBe(1);
		expect(node.querySelector('h1').textContent).toBe('Second');
	});

	test('goes back on escape', () => {
		const node = root();
		const router = createRouter({ root: node });
		router.go(menu, { title: 'Main menu' });
		router.go(settings);
		const event = escape();
		expect(node.querySelector('h1').textContent).toBe('Main menu');
		expect(event.defaultPrevented).toBe(true);
	});

	test('leaves escape alone at the root', () => {
		const node = root();
		const router = createRouter({ root: node });
		router.go(menu);
		expect(escape().defaultPrevented).toBe(false);
	});

	test('leaves escape alone for a screen that opts out', () => {
		const node = root();
		const router = createRouter({ root: node });
		router.go(menu, { title: 'Main menu' });
		router.go(settings, {}, { escape: false });
		escape();
		expect(node.querySelector('#field-name')).not.toBe(null);
		expect(router.depth).toBe(2);
	});

	test('leaves escape alone everywhere when the router opts out', () => {
		const node = root();
		const router = createRouter({ root: node, escape: false });
		router.go(menu);
		router.go(settings);
		escape();
		expect(router.depth).toBe(2);
	});

	test('clears the root and unbinds escape on dispose', () => {
		const node = root();
		const router = createRouter({ root: node });
		router.go(menu);
		router.go(settings);
		router.dispose();
		expect(node.innerHTML).toBe('');
		expect(router.depth).toBe(0);
		expect(router.current).toBe(null);
		expect(escape().defaultPrevented).toBe(false);
	});
});
