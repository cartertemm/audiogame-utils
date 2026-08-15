import { describe, test, expect, afterEach } from 'vitest';
import { createFocusTrap } from '../src/focus.js';

function container(html = '') {
	const node = document.createElement('div');
	node.innerHTML = html;
	document.body.appendChild(node);
	return node;
}

function tab(node, shiftKey = false) {
	const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true });
	node.dispatchEvent(event);
	return event;
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('focus: createFocusTrap', () => {
	test('marks the node as an application and focuses it', () => {
		const node = container();
		createFocusTrap(node);
		expect(node.getAttribute('role')).toBe('application');
		expect(node.getAttribute('tabindex')).toBe('-1');
		expect(document.activeElement).toBe(node);
	});

	test('keeps a role and tabindex the developer already set', () => {
		const node = container();
		node.setAttribute('role', 'region');
		node.setAttribute('tabindex', '0');
		const trap = createFocusTrap(node);
		expect(node.getAttribute('role')).toBe('region');
		expect(node.getAttribute('tabindex')).toBe('0');
		trap.release();
		expect(node.getAttribute('role')).toBe('region');
		expect(node.getAttribute('tabindex')).toBe('0');
	});

	test('removes the attributes it added on release', () => {
		const node = container();
		createFocusTrap(node, { label: 'Game' }).release();
		expect(node.hasAttribute('role')).toBe(false);
		expect(node.hasAttribute('tabindex')).toBe(false);
		expect(node.hasAttribute('aria-label')).toBe(false);
	});

	test('sets aria-label when a label is given', () => {
		const node = container();
		createFocusTrap(node, { label: 'Game' });
		expect(node.getAttribute('aria-label')).toBe('Game');
	});

	test('restores focus to the element that had it', () => {
		const before = document.createElement('button');
		document.body.appendChild(before);
		before.focus();
		const node = container();
		createFocusTrap(node).release();
		expect(document.activeElement).toBe(before);
	});

	test('leaves focus alone on release when restoreFocus is false', () => {
		const before = document.createElement('button');
		document.body.appendChild(before);
		before.focus();
		const node = container();
		createFocusTrap(node, { restoreFocus: false }).release();
		expect(document.activeElement).toBe(node);
	});

	test('pulls focus back when it moves outside the node', () => {
		const outside = document.createElement('button');
		document.body.appendChild(outside);
		const node = container();
		createFocusTrap(node);
		outside.focus();
		expect(document.activeElement).toBe(node);
	});

	test('lets focus move to a descendant', () => {
		const node = container('<button id="play">Play</button>');
		createFocusTrap(node);
		const button = node.querySelector('#play');
		button.focus();
		expect(document.activeElement).toBe(button);
	});

	test('prevents tab when the node has no tabbable descendants', () => {
		const node = container('<p>No controls here</p>');
		createFocusTrap(node);
		const event = tab(node);
		expect(event.defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(node);
	});

	test('wraps tab from the last descendant to the first', () => {
		const node = container('<button id="a">A</button><button id="b">B</button>');
		createFocusTrap(node);
		const last = node.querySelector('#b');
		last.focus();
		const event = tab(last);
		expect(event.defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(node.querySelector('#a'));
	});

	test('wraps shift+tab from the first descendant to the last', () => {
		const node = container('<button id="a">A</button><button id="b">B</button>');
		createFocusTrap(node);
		const first = node.querySelector('#a');
		first.focus();
		const event = tab(first, true);
		expect(event.defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(node.querySelector('#b'));
	});

	test('skips disabled and hidden descendants', () => {
		const node = container('<button id="a">A</button><button id="b" disabled>B</button>');
		createFocusTrap(node);
		const first = node.querySelector('#a');
		first.focus();
		tab(first);
		expect(document.activeElement).toBe(first);
	});

	test('ignores keys other than tab', () => {
		const node = container();
		createFocusTrap(node);
		const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
		node.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(false);
	});

	test('stops trapping focus after release', () => {
		const outside = document.createElement('button');
		document.body.appendChild(outside);
		const node = container();
		createFocusTrap(node, { restoreFocus: false }).release();
		outside.focus();
		expect(document.activeElement).toBe(outside);
	});

	test('release is safe to call twice', () => {
		const before = document.createElement('button');
		document.body.appendChild(before);
		before.focus();
		const node = container();
		const trap = createFocusTrap(node);
		trap.release();
		node.focus();
		trap.release();
		expect(document.activeElement).toBe(node);
	});
});
