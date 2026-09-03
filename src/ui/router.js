// @ts-self-types="./router.d.ts"
// A stack of screens with back navigation that puts focus where it was.

import { tabbable } from '../focus.js';
import { renderScreen } from './dom.js';

export function createRouter({ root, escape = true } = {}) {
	if (!root) throw new Error('createRouter requires a root element');
	const stack = [];
	let rendered = null;

	// An id alone misses plain menu buttons, and a position alone breaks when a
	// screen renders a different number of controls than last time.
	function recordFocus() {
		const active = document.activeElement;
		if (!active || !root.contains(active)) return null;
		const index = tabbable(root).indexOf(active);
		return { id: active.id || null, index: index >= 0 ? index : null };
	}

	function restoreFocus(mark) {
		if (!mark) return;
		if (mark.id) {
			const byId = root.querySelector(`#${mark.id}`);
			if (byId) {
				byId.focus();
				return;
			}
		}
		if (mark.index === null) return;
		// Nothing to do on a miss. mount() has already honored the screen's own
		// autofocus, so focus is not sitting on the body.
		tabbable(root)[mark.index]?.focus();
	}

	function leave() {
		rendered?.dispose();
		rendered = null;
	}

	function enter(screen, props, options) {
		stack.push({ screen, props, escape: escape && options.escape !== false, focus: null });
		rendered = renderScreen(root, screen, props);
	}

	function onKeyDown(event) {
		if (event.key !== 'Escape') return;
		if (!stack[stack.length - 1]?.escape) return;
		if (!router.back()) return;
		event.preventDefault();
	}

	const router = {
		get depth() {
			return stack.length;
		},

		get current() {
			return stack[stack.length - 1]?.screen ?? null;
		},

		go(screen, props = {}, options = {}) {
			const top = stack[stack.length - 1];
			if (top) top.focus = recordFocus();
			leave();
			enter(screen, props, options);
		},

		replace(screen, props = {}, options = {}) {
			leave();
			stack.pop();
			enter(screen, props, options);
		},

		back() {
			if (stack.length <= 1) return false;
			leave();
			stack.pop();
			const entry = stack[stack.length - 1];
			rendered = renderScreen(root, entry.screen, entry.props);
			restoreFocus(entry.focus);
			return true;
		},

		dispose() {
			leave();
			stack.length = 0;
			document.removeEventListener('keydown', onKeyDown);
		},
	};

	// On the document rather than the root, because a screen that focuses nothing
	// leaves the event on the body, where a root listener never sees it.
	document.addEventListener('keydown', onKeyDown);
	return router;
}
