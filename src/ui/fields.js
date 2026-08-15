// Accessible form field builders. Each one returns a DOM node, so it drops
// straight into mount() next to anything el() produces.
//
// Every builder calls options.set(value, display), where display is a readable
// rendering of the value the builder already had to compute. A set() that takes
// only a value keeps working, because the extra argument is ignored.

import { el } from './dom.js';

let counter = 0;

function nextId() {
	counter += 1;
	return `field-${counter}`;
}

// Attributes every control shares. `disabled` is a boolean at the call site but
// an attribute in the DOM, so it maps to a string or to nothing at all.
function common(id, hintId, options) {
	return {
		id,
		'aria-describedby': hintId,
		autoFocus: options.autoFocus,
		disabled: options.disabled ? 'disabled' : undefined,
	};
}

function hintNode(hintId, options) {
	return options.hint ? el('p', { class: 'hint', id: hintId, text: options.hint }) : null;
}

// Builds the label, hint, and describedby wiring once, then lets each builder
// supply only its control. `build` may return extra sibling nodes, such as a
// datalist, alongside the control itself.
function field(label, options, build, { labelAfter = false, className = 'field' } = {}) {
	const id = options.id ?? nextId();
	const hintId = options.hint ? `${id}-hint` : undefined;
	const [control, ...extras] = [].concat(build(id, hintId));
	const labelNode = el('label', { for: id, text: label });
	return el('div', { class: className },
		...(labelAfter ? [control, labelNode] : [labelNode, control]),
		...extras,
		hintNode(hintId, options),
	);
}

export function textField(label, options = {}) {
	return field(label, options, (id, hintId) => {
		const listId = options.suggestions ? `${id}-list` : undefined;
		const input = el('input', {
			...common(id, hintId, options),
			type: 'text',
			value: options.get(),
			maxlength: options.maxLength,
			list: listId,
			onChange: (event) => options.set(event.target.value),
		});
		if (!listId) return input;
		return [input, el('datalist', { id: listId }, ...options.suggestions.map(value => el('option', { value })))];
	});
}

export function passwordField(label, options = {}) {
	return field(label, options, (id, hintId) => el('input', {
		...common(id, hintId, options),
		type: 'password',
		value: options.get(),
		maxlength: options.maxLength,
		onChange: (event) => options.set(event.target.value),
	}));
}

export function textAreaField(label, options = {}) {
	return field(label, options, (id, hintId) => el('textarea', {
		...common(id, hintId, options),
		rows: options.rows,
		text: options.get(),
		// Reading a long body of text back on every commit is worse than
		// confirming that it landed.
		onChange: (event) => options.set(event.target.value, 'saved'),
	}));
}

export function numberField(label, options = {}) {
	return field(label, options, (id, hintId) => el('input', {
		...common(id, hintId, options),
		type: 'number',
		min: options.min,
		max: options.max,
		step: options.step,
		value: String(options.get()),
		onChange: (event) => options.set(Number(event.target.value)),
	}));
}

const PERCENT_RANGE = { min: 0, max: 1, step: 0.05 };

function percentOf(value) {
	return `${Math.round(Number(value) * 100)} percent`;
}

// `input` fires while dragging and only refreshes what the value reads as.
// `change` fires on release and is the one that commits.
export function rangeField(label, options = {}) {
	return field(label, options, (id, hintId) => {
		const { format } = options;
		const value = options.get();
		const readout = format ? el('span', { 'aria-hidden': 'true', text: format(value) }) : null;
		const input = el('input', {
			...common(id, hintId, options),
			type: 'range',
			min: options.min,
			max: options.max,
			step: options.step,
			value: String(value),
			// A range input otherwise announces the raw number, so a volume
			// slider reads "0.65" where the screen shows "65 percent".
			'aria-valuetext': format ? format(value) : undefined,
			onInput: (event) => {
				if (!format) return;
				// get() hands format a number, so the DOM string has to as well.
				const text = format(Number(event.target.value));
				event.target.setAttribute('aria-valuetext', text);
				readout.textContent = text;
			},
			onChange: (event) => {
				const next = Number(event.target.value);
				options.set(next, format ? format(next) : undefined);
			},
		});
		return readout ? [input, readout] : input;
	});
}

export function percentRangeField(label, options = {}) {
	return rangeField(label, { ...PERCENT_RANGE, format: percentOf, ...options });
}

export function selectField(label, options = {}) {
	return field(label, options, (id, hintId) => {
		const current = options.get();
		return el('select', {
			...common(id, hintId, options),
			// The DOM only ever hands back a string, so the original choice is
			// what gets committed. Otherwise a numeric value round-trips as a
			// string and stops matching on the next render.
			onChange: (event) => {
				const choice = options.choices.find(c => String(c.value) === event.target.value);
				if (!choice) return;
				options.set(choice.value, choice.label);
			},
		}, ...options.choices.map(choice => el('option', {
			value: choice.value,
			text: choice.label,
			selected: choice.value === current ? 'selected' : undefined,
		})));
	});
}

export function checkboxField(label, options = {}) {
	return field(label, options, (id, hintId) => el('input', {
		...common(id, hintId, options),
		type: 'checkbox',
		checked: options.get() ? 'checked' : undefined,
		onChange: (event) => options.set(event.target.checked, event.target.checked ? 'on' : 'off'),
	}), { labelAfter: true, className: 'field check' });
}

// A group is labelled by its legend, so it skips the field() wrapper. The hint
// sits on the fieldset and on every item, because the fieldset description is
// not announced when focus lands on one radio or checkbox inside it.
function group(legend, options, buildItems) {
	const id = options.id ?? nextId();
	const hintId = options.hint ? `${id}-hint` : undefined;
	return el('fieldset', { id, 'aria-describedby': hintId },
		el('legend', { text: legend }),
		...buildItems(id, hintId),
		hintNode(hintId, options),
	);
}

function groupItem(input, id, label) {
	return el('div', { class: 'check' }, input, el('label', { for: id, text: label }));
}

export function radioGroup(legend, options = {}) {
	return group(legend, options, (id, hintId) => {
		const current = options.get();
		return options.choices.map((choice, index) => {
			const itemId = `${id}-${choice.value}`;
			return groupItem(el('input', {
				...common(itemId, hintId, options),
				autoFocus: options.autoFocus && index === 0 ? true : undefined,
				type: 'radio',
				name: id,
				value: choice.value,
				checked: choice.value === current ? 'checked' : undefined,
				onChange: (event) => {
					if (event.target.checked) options.set(choice.value, choice.label);
				},
			}), itemId, choice.label);
		});
	});
}

export function checkboxGroup(legend, options = {}) {
	return group(legend, options, (id, hintId) => {
		const selected = new Set(options.get());
		return options.choices.map((choice, index) => {
			const itemId = `${id}-${choice.value}`;
			return groupItem(el('input', {
				...common(itemId, hintId, options),
				autoFocus: options.autoFocus && index === 0 ? true : undefined,
				type: 'checkbox',
				value: choice.value,
				checked: selected.has(choice.value) ? 'checked' : undefined,
				onChange: (event) => {
					if (event.target.checked) selected.add(choice.value);
					else selected.delete(choice.value);
					// What changed, rather than everything that is now on.
					options.set([...selected], `${choice.label} ${event.target.checked ? 'on' : 'off'}`);
				},
			}), itemId, choice.label);
		});
	});
}

export function keyName(key) {
	if (key === ' ') return 'Space';
	return key;
}

// Rebinding needs keys the page would otherwise act on, so the listener lives on
// the document, captures, and stops the event before a game listener on window
// sees it. It removes itself on the first keydown, which leaves nothing for the
// caller to tear down.
export function keyField(label, options = {}) {
	const id = options.id ?? nextId();
	const hintId = options.hint ? `${id}-hint` : undefined;
	const idle = () => `${label}: ${keyName(options.get())}`;

	function onKeyDown(event) {
		document.removeEventListener('keydown', onKeyDown, { capture: true });
		// The screen may have torn down while capture was pending, leaving the
		// button detached. Without this guard the stale closure would swallow
		// the keystroke and write to a discarded config.
		if (!button.isConnected) return;
		event.preventDefault();
		event.stopPropagation();
		if (event.key === 'Escape') {
			button.textContent = idle();
			return;
		}
		options.set(event.key, keyName(event.key));
		button.textContent = `${label}: ${keyName(event.key)}`;
	}

	const button = el('button', {
		...common(id, hintId, options),
		type: 'button',
		text: idle(),
		onClick: () => {
			button.textContent = `${label}: press a key, or escape to cancel`;
			document.addEventListener('keydown', onKeyDown, { capture: true });
		},
	});

	return el('div', { class: 'field' },
		button,
		hintNode(hintId, options),
	);
}

// Two presses instead of a confirm dialog, which screen readers and game
// controllers both handle badly.
export function confirmButton(label, options = {}) {
	const button = el('button', {
		...common(options.id ?? nextId(), undefined, options),
		type: 'button',
		class: options.class,
		text: label,
		onClick: () => {
			if (button.dataset.armed !== 'true') {
				button.dataset.armed = 'true';
				button.textContent = options.confirmLabel;
				return;
			}
			button.dataset.armed = 'false';
			button.textContent = label;
			options.onConfirm();
		},
	});
	return button;
}

// `display` names the value only, so most fields need their label in front of
// it to make sense. Two do not: a key field wants a verb between the two, and a
// checkbox group's display already names the choice that toggled, which makes
// the group legend redundant in front of it.
const plainMessage = (label, display) => `${label} ${display}`;
const keyMessage = (label, display) => `${label} bound to ${display}`;
const displayOnly = (label, display) => display;

// Sugar for the common case, where every field is one key in a storage
// instance. `onChange` is the single seam for side effects, so the library
// itself never needs to know about speech or anything else. It receives a
// ready-to-announce `message` as well as the raw parts, so a caller that just
// speaks every change needs no per-field phrasing of its own.
export function createFields({ storage, defaults = {}, onChange = null } = {}) {
	if (!storage) throw new Error('createFields requires a storage instance');
	const bind = (builder, message = plainMessage) => (key, label, options = {}) => {
		const set = (value, display) => {
			storage.set(key, value);
			const text = display ?? String(value);
			onChange?.(key, value, label, text, message(label, text));
		};
		return builder(label, {
			...options,
			id: options.id ?? `field-${key}`,
			get: () => storage.get(key, defaults[key]),
			set,
		});
	};
	return {
		text: bind(textField),
		password: bind(passwordField),
		textArea: bind(textAreaField),
		number: bind(numberField),
		range: bind(rangeField),
		percentRange: bind(percentRangeField),
		select: bind(selectField),
		checkbox: bind(checkboxField),
		radioGroup: bind(radioGroup),
		checkboxGroup: bind(checkboxGroup, displayOnly),
		key: bind(keyField, keyMessage),
	};
}
