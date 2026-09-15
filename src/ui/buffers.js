// Live HTML views of speech buffers: a plain list per buffer, and an ARIA tab control over a manager.

import { el } from './dom.js';

const LIST_STYLE = 'list-style: none; margin: 0; padding: 0';
const TAB_KEYS = { ArrowLeft: -1, ArrowRight: 1 };
let nextControlId = 0;

function itemNode(item) {
	return el('li', { text: item.text });
}

function markCurrent(list, position) {
	for (const [index, node] of [...list.children].entries()) {
		const isCurrent = index === position;
		node.classList.toggle('current', isCurrent);
		if (isCurrent) node.setAttribute('aria-current', 'true');
		else node.removeAttribute('aria-current');
	}
}

export function renderBufferList(buffer, { manager = null } = {}) {
	const list = el('ul', { style: LIST_STYLE, 'aria-label': buffer.name }, ...buffer.items.map(itemNode));
	markCurrent(list, buffer.position);
	const unsubscribe = [];
	if (manager) {
		const forThisBuffer = handler => event => {
			if (event.buffer === buffer) handler();
		};
		unsubscribe.push(
			manager.on('add', forThisBuffer(() => {
				if (buffer.length > 0) list.appendChild(itemNode(buffer.items[buffer.length - 1]));
				while (list.children.length > buffer.length) list.removeChild(list.firstChild);
				markCurrent(list, buffer.position);
			})),
			manager.on('clear', forThisBuffer(() => {
				list.innerHTML = '';
			})),
			manager.on('move', forThisBuffer(() => markCurrent(list, buffer.position))),
		);
	}
	list.dispose = () => {
		for (const off of unsubscribe) off();
		unsubscribe.length = 0;
	};
	return list;
}

export function renderBufferManager(manager) {
	const prefix = `buffer-tabs-${nextControlId++}`;
	let nextEntryId = 0;
	const tablist = el('div', { role: 'tablist' });
	const root = el('div', { class: 'buffer-manager' }, tablist);
	const entries = new Map();
	let disposed = false;

	function select() {
		const current = manager.current;
		for (const [buffer, entry] of entries) {
			const selected = buffer === current;
			entry.tab.setAttribute('aria-selected', String(selected));
			entry.tab.tabIndex = selected ? 0 : -1;
			entry.panel.hidden = !selected;
		}
	}

	function addBuffer(buffer) {
		const id = `${prefix}-${nextEntryId++}`;
		const list = renderBufferList(buffer, { manager });
		const panel = el('div', { role: 'tabpanel', tabindex: 0, id: `${id}-panel`, 'aria-labelledby': `${id}-tab` }, list);
		const tab = el('button', {
			type: 'button',
			role: 'tab',
			id: `${id}-tab`,
			'aria-controls': `${id}-panel`,
			text: buffer.name,
			onClick: () => {
				if (disposed) return;
				manager.focusBuffer(buffer, { silent: true });
			},
		});
		tablist.appendChild(tab);
		root.appendChild(panel);
		entries.set(buffer, { tab, panel, list });
	}

	function removeBuffer(buffer) {
		const entry = entries.get(buffer);
		if (!entry) return;
		entry.list.dispose();
		entry.tab.remove();
		entry.panel.remove();
		entries.delete(buffer);
	}

	tablist.addEventListener('keydown', event => {
		if (disposed) return;
		const step = TAB_KEYS[event.key];
		if (!step) return;
		event.preventDefault();
		if (step > 0) manager.nextBuffer({ wrap: true, silent: true });
		else manager.previousBuffer({ wrap: true, silent: true });
		entries.get(manager.current)?.tab.focus();
	});

	for (const buffer of manager.buffers) addBuffer(buffer);
	select();
	const unsubscribe = [
		manager.on('create', ({ buffer }) => {
			addBuffer(buffer);
			select();
		}),
		manager.on('delete', ({ buffer }) => {
			removeBuffer(buffer);
			select();
		}),
		manager.on('focus', select),
	];
	root.dispose = () => {
		disposed = true;
		for (const off of unsubscribe) off();
		unsubscribe.length = 0;
		for (const entry of entries.values()) entry.list.dispose();
	};
	return root;
}
