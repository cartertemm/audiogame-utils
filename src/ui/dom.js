// Minimal helpers for building accessible pre-game screens.

export function el(tag, attrs = {}, ...children) {
	const node = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs)) {
		if (k === 'text') node.textContent = v;
		// Assuming we would never want to set focus on a standard text element, which is weird practice
		else if (k === 'autoFocus') { if (v) node.dataset.autofocus = 'true'; }
		else if (k.startsWith('on') && typeof v === 'function') {
			node.addEventListener(k.slice(2).toLowerCase(), v);
		} else if (v !== undefined && v !== null) {
			node.setAttribute(k, v);
		}
	}
	for (const c of children) {
		if (c == null) continue;
		node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
	}
	return node;
}

export function mount(root, nodes) {
	root.innerHTML = '';
	for (const n of nodes) {
		if (n == null) continue;
		root.appendChild(n);
	}
	const autofocus = root.querySelector('[data-autofocus="true"]');
	autofocus?.focus();
}

// Renders `screen`, a function taking (root, props). If it returns a function,
// that function runs on dispose, before the root is emptied.
export function renderScreen(root, screen, props = {}) {
	if (typeof screen !== 'function') throw new TypeError('screen must be a function');
	const cleanup = screen(root, props);
	let disposed = false;
	return {
		dispose() {
			if (disposed) return;
			disposed = true;
			if (typeof cleanup === 'function') cleanup();
			root.innerHTML = '';
		},
	};
}
