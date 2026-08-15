// Accessible form field builders. Each one returns a DOM node, so it drops
// straight into mount() next to anything el() produces.

import { el } from './ui.js';

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
		options.hint ? el('p', { class: 'hint', id: hintId, text: options.hint }) : null,
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
		onChange: (event) => options.set(event.target.value),
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
