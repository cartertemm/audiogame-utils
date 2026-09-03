// @ts-self-types="./focus.d.ts"
// `createFocusTrap` hands every keypress to the game.
// It does this by applying `role="application"` to keep screen readers out of browse mode.
// It also traps focus within the container, so tab and shift+tab do not go to the browser.

const TABBABLE = 'a[href], button, input, select, textarea, [tabindex]';

export function tabbable(node) {
	return [...node.querySelectorAll(TABBABLE)].filter(el => (
		!el.disabled && !el.hidden && el.getAttribute('tabindex') !== '-1'
	));
}

export function createFocusTrap(node, options = {}) {
	const restoreFocus = options.restoreFocus ?? true;
	const previous = document.activeElement;
	const added = [];
	let released = false;

	function add(name, value) {
		if (node.hasAttribute(name)) return;
		node.setAttribute(name, value);
		added.push(name);
	}

	function onKeyDown(event) {
		if (event.key !== 'Tab') return;
		event.preventDefault();
		const items = tabbable(node);
		if (items.length === 0) {
			node.focus();
			return;
		}
		const index = items.indexOf(document.activeElement);
		const step = event.shiftKey ? -1 : 1;
		const next = (index + step + items.length) % items.length;
		items[next].focus();
	}

	function onFocusIn(event) {
		if (node.contains(event.target)) return;
		node.focus();
	}
	add('role', 'application');
	add('tabindex', '-1');
	if (options.label) add('aria-label', options.label);
	node.focus();
	node.addEventListener('keydown', onKeyDown);
	document.addEventListener('focusin', onFocusIn);

	return {
		release() {
			if (released) return;
			released = true;
			node.removeEventListener('keydown', onKeyDown);
			document.removeEventListener('focusin', onFocusIn);
			for (const name of added) node.removeAttribute(name);
			if (restoreFocus) previous?.focus?.();
		},
	};
}
