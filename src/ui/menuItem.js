// One row of a menu. The `TYPES` table holds everything that differs between
// row kinds, so a new kind is one entry rather than a subclass.
//
// A row announces itself two ways. `speak()` runs when the cursor arrives and
// gives the label with the value. `speakValue()` runs when the value moves and
// gives the value alone, because repeating the label on every arrow press makes
// a slider unusable.

import { clamp } from '../math.js';
import { el } from './dom.js';
import { rangeField, checkboxField } from './fields.js';

function sliderText(item) {
	return item.format ? item.format(item._value) : String(item._value);
}

const TYPES = {
	text: {
		init() {},

		build(item) {
			return el('button', {
				class: 'field',
				type: 'button',
				text: item._label,
				tabindex: '-1',
				disabled: item._disabled ? 'disabled' : undefined,
			});
		},

		speak(item) {
			return item._label;
		},

		speakValue: null,
		adjust: null,
	},

	slider: {
		init(item, options) {
			item.min = options.min ?? 0;
			item.max = options.max ?? 100;
			item.step = options.step ?? 1;
			item._value = clamp(Number(options.defaultValue ?? options.min ?? 0), item.min, item.max);
		},

		build(item) {
			const node = rangeField(item._label, {
				get: () => item._value,
				set: (value) => item._set(value),
				min: item.min,
				max: item.max,
				step: item.step,
				format: item.format ?? undefined,
				hint: item.hint,
				disabled: item._disabled,
			});
			item._control = node.querySelector('input');
			item._control.setAttribute('tabindex', '-1');
			item._readout = node.querySelector('span');
			return node;
		},

		coerce(item, next) {
			return clamp(Number(next), item.min, item.max);
		},

		sync(item) {
			item._control.value = String(item._value);
			if (!item.format) return;
			const text = item.format(item._value);
			item._control.setAttribute('aria-valuetext', text);
			if (item._readout) item._readout.textContent = text;
		},

		speak(item) {
			return `${item._label}, ${sliderText(item)}`;
		},

		speakValue: sliderText,

		adjust(item, direction) {
			return item._set(item._value + direction * item.step);
		},
	},

	checkbox: {
		init(item, options) {
			item._value = options.defaultState === true;
		},

		build(item) {
			const node = checkboxField(item._label, {
				get: () => item._value,
				set: (value) => item._set(value),
				hint: item.hint,
				disabled: item._disabled,
			});
			item._control = node.querySelector('input');
			item._control.setAttribute('tabindex', '-1');
			return node;
		},

		coerce(item, next) {
			return next === true;
		},

		sync(item) {
			item._control.checked = item._value;
		},

		speak(item) {
			return `${item._label}, ${TYPES.checkbox.speakValue(item)}`;
		},

		speakValue(item) {
			return item._value ? 'checked' : 'unchecked';
		},

		toggle(item) {
			return item._set(!item._value);
		},

		adjust(item) {
			return TYPES.checkbox.toggle(item);
		},
	},
};

export class MenuItem {
	constructor(menu, type, label, options = {}) {
		const spec = TYPES[type];
		if (!spec) throw new Error(`unknown menu item type: ${type}`);
		this.menu = menu;
		this.type = type;
		this.id = options.id ?? null;
		this.hint = options.hint;
		this.format = options.format ?? null;
		this.onChange = options.onChange ?? null;
		this._spec = spec;
		this._label = label;
		this._disabled = options.disabled === true;
		this._speak = options.speak ?? null;
		this._speakValue = options.speakValue ?? null;
		this._value = undefined;
		this._control = null;
		this._readout = null;
		spec.init(this, options);
		this.node = spec.build(this);
	}

	get label() {
		return this._label;
	}

	set label(text) {
		this._label = text;
		this.menu._rebuild(this);
	}

	get disabled() {
		return this._disabled;
	}

	set disabled(flag) {
		this._disabled = flag === true;
		this.menu._rebuild(this);
	}

	get value() {
		return this._value;
	}

	set value(next) {
		this._set(next);
	}

	get index() {
		return this.menu.items.indexOf(this);
	}

	speak() {
		return this._speak ? this._speak(this) : this._spec.speak(this);
	}

	speakValue() {
		if (this._speakValue) return this._speakValue(this);
		return this._spec.speakValue ? this._spec.speakValue(this) : '';
	}

	focus() {
		this.menu.focusedItem = this;
	}

	toggle() {
		return this._spec.toggle ? this._spec.toggle(this) : false;
	}

	adjust(direction) {
		return this._spec.adjust ? this._spec.adjust(this, direction) : false;
	}

	// Replaces the node in place, so a label or disabled change survives without
	// redrawing the whole menu.
	rebuild() {
		const previous = this.node;
		this.node = this._spec.build(this);
		if (previous.parentNode) previous.replaceWith(this.node);
		return this.node;
	}

	// Every value change funnels through here, whether it came from a key, a
	// gesture, a mouse drag, or the caller. One path means one announcement.
	_set(next) {
		if (!this._spec.coerce) return false;
		const value = this._spec.coerce(this, next);
		if (value === this._value) return false;
		this._value = value;
		this._spec.sync(this);
		this.onChange?.(value);
		this.menu._valueChanged(this);
		return true;
	}
}
