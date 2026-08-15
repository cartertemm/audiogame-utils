// Accessible form field builders. Each one returns a DOM node and can be used with the mount() function

import { el } from './dom.js';

let counter = 0;

function nextId() {
	counter += 1;
	return `field-${counter}`;
}

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

// The hint goes on the fieldset and on every item. Screen readers skip the
// fieldset description when focus lands on an item, so both are needed.
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

export function keyField(label, options = {}) {
	const id = options.id ?? nextId();
	const hintId = options.hint ? `${id}-hint` : undefined;
	const idle = () => `${label}: ${keyName(options.get())}`;

	function onKeyDown(event) {
		document.removeEventListener('keydown', onKeyDown, { capture: true });
		// The screen may have torn down while capture was pending, and we don't want to write to a discarded config
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

const plainMessage = (label, display) => `${label} ${display}`;
const keyMessage = (label, display) => `${label} bound to ${display}`;
const displayOnly = (label, display) => display;

const BUILDERS = {
	text: [textField],
	password: [passwordField],
	textArea: [textAreaField],
	number: [numberField],
	range: [rangeField],
	percentRange: [percentRangeField],
	select: [selectField],
	checkbox: [checkboxField],
	radioGroup: [radioGroup],
	checkboxGroup: [checkboxGroup, displayOnly],
	key: [keyField, keyMessage],
};

export function createFields({ storage, defaults = {}, onChange = null } = {}) {
	if (!storage) throw new Error('createFields requires a storage instance');
	const bind = (type, builder, message) => (key, label, options = {}) => {
		const set = (value, display) => {
			storage.set(key, value);
			const text = display ?? String(value);
			onChange?.({ key, value, label, display: text, type, message: message(label, text) });
		};
		return builder(label, {
			...options,
			id: options.id ?? `field-${key}`,
			get: () => storage.get(key, defaults[key]),
			set,
		});
	};
	return Object.fromEntries(Object.entries(BUILDERS).map(
		([type, [builder, message = plainMessage]]) => [type, bind(type, builder, message)],
	));
}
