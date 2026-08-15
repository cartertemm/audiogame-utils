import { describe, test, expect, vi } from 'vitest';
import { textField, passwordField, textAreaField, numberField, rangeField, percentRangeField, selectField, checkboxField, radioGroup, checkboxGroup, keyField, keyName, confirmButton, createFields } from '../src/ui/fields.js';
import { createStorage } from '../src/storage.js';

const percent = (value) => `${Math.round(Number(value) * 100)} percent`;

describe('fields: textField', () => {
	test('pairs the label with the input', () => {
		const node = textField('Player name', { get: () => 'Pilot', set: () => {} });
		const label = node.querySelector('label');
		const input = node.querySelector('input');
		expect(input.getAttribute('type')).toBe('text');
		expect(input.getAttribute('value')).toBe('Pilot');
		expect(label.textContent).toBe('Player name');
		expect(label.getAttribute('for')).toBe(input.getAttribute('id'));
	});

	test('generates a unique id per field', () => {
		const first = textField('One', { get: () => '', set: () => {} });
		const second = textField('Two', { get: () => '', set: () => {} });
		const a = first.querySelector('input').getAttribute('id');
		const b = second.querySelector('input').getAttribute('id');
		expect(a).not.toBe(b);
	});

	test('honours an explicit id', () => {
		const node = textField('Name', { id: 'custom', get: () => '', set: () => {} });
		expect(node.querySelector('input').getAttribute('id')).toBe('custom');
		expect(node.querySelector('label').getAttribute('for')).toBe('custom');
	});

	test('wires the hint through aria-describedby', () => {
		const node = textField('Name', { hint: 'Other players see this.', get: () => '', set: () => {} });
		const input = node.querySelector('input');
		const hint = node.querySelector('p.hint');
		expect(hint.textContent).toBe('Other players see this.');
		expect(input.getAttribute('aria-describedby')).toBe(hint.getAttribute('id'));
	});

	test('omits aria-describedby when there is no hint', () => {
		const node = textField('Name', { get: () => '', set: () => {} });
		expect(node.querySelector('input').hasAttribute('aria-describedby')).toBe(false);
		expect(node.querySelector('p.hint')).toBe(null);
	});

	test('commits the value on change', () => {
		const set = vi.fn();
		const node = textField('Name', { get: () => '', set });
		const input = node.querySelector('input');
		input.value = 'Falcon';
		input.dispatchEvent(new Event('change'));
		expect(set).toHaveBeenCalledWith('Falcon');
	});

	test('renders a datalist for suggestions', () => {
		const node = textField('Callsign', { get: () => '', set: () => {}, suggestions: ['Viper', 'Nomad'] });
		const input = node.querySelector('input');
		const list = node.querySelector('datalist');
		expect(input.getAttribute('list')).toBe(list.getAttribute('id'));
		expect([...list.querySelectorAll('option')].map(o => o.getAttribute('value'))).toEqual(['Viper', 'Nomad']);
	});

	test('applies maxLength, autoFocus, and disabled', () => {
		const node = textField('Name', { get: () => '', set: () => {}, maxLength: 24, autoFocus: true, disabled: true });
		const input = node.querySelector('input');
		expect(input.getAttribute('maxlength')).toBe('24');
		expect(input.dataset.autofocus).toBe('true');
		expect(input.hasAttribute('disabled')).toBe(true);
	});
});

describe('fields: passwordField', () => {
	test('renders a password input paired with its label', () => {
		const node = passwordField('Server password', { get: () => 'hunter2', set: () => {} });
		const input = node.querySelector('input');
		expect(input.getAttribute('type')).toBe('password');
		expect(input.getAttribute('value')).toBe('hunter2');
		expect(node.querySelector('label').getAttribute('for')).toBe(input.getAttribute('id'));
	});

	test('commits the value on change', () => {
		const set = vi.fn();
		const node = passwordField('Password', { get: () => '', set });
		const input = node.querySelector('input');
		input.value = 'letmein';
		input.dispatchEvent(new Event('change'));
		expect(set).toHaveBeenCalledWith('letmein');
	});
});

describe('fields: textAreaField', () => {
	test('seeds the textarea with the current value', () => {
		const node = textAreaField('Greeting', { get: () => 'Systems online.', set: () => {}, rows: 3 });
		const area = node.querySelector('textarea');
		expect(area.textContent).toBe('Systems online.');
		expect(area.getAttribute('rows')).toBe('3');
		expect(node.querySelector('label').getAttribute('for')).toBe(area.getAttribute('id'));
	});

	test('commits the value on change', () => {
		const set = vi.fn();
		const node = textAreaField('Greeting', { get: () => '', set });
		const area = node.querySelector('textarea');
		area.value = 'Good hunting.';
		area.dispatchEvent(new Event('change'));
		expect(set).toHaveBeenCalledWith('Good hunting.', 'saved');
	});
});

describe('fields: numberField', () => {
	test('applies min, max, and step', () => {
		const node = numberField('Turn step', { get: () => 15, set: () => {}, min: 5, max: 90, step: 5 });
		const input = node.querySelector('input');
		expect(input.getAttribute('type')).toBe('number');
		expect(input.getAttribute('min')).toBe('5');
		expect(input.getAttribute('max')).toBe('90');
		expect(input.getAttribute('step')).toBe('5');
		expect(input.getAttribute('value')).toBe('15');
	});

	test('commits a number, not a string', () => {
		const set = vi.fn();
		const node = numberField('Turn step', { get: () => 15, set });
		const input = node.querySelector('input');
		input.value = '30';
		input.dispatchEvent(new Event('change'));
		expect(set).toHaveBeenCalledWith(30);
	});
});

describe('fields: rangeField', () => {
	test('applies min, max, step, and the current value', () => {
		const node = rangeField('Master volume', { get: () => 0.65, set: () => {}, min: 0, max: 1, step: 0.05 });
		const input = node.querySelector('input');
		expect(input.getAttribute('type')).toBe('range');
		expect(input.getAttribute('min')).toBe('0');
		expect(input.getAttribute('max')).toBe('1');
		expect(input.getAttribute('step')).toBe('0.05');
		expect(input.getAttribute('value')).toBe('0.65');
	});

	test('sets aria-valuetext and a hidden readout from format', () => {
		const node = rangeField('Master volume', { get: () => 0.65, set: () => {}, min: 0, max: 1, step: 0.05, format: percent });
		const input = node.querySelector('input');
		const readout = node.querySelector('span');
		expect(input.getAttribute('aria-valuetext')).toBe('65 percent');
		expect(readout.getAttribute('aria-hidden')).toBe('true');
		expect(readout.textContent).toBe('65 percent');
	});

	test('updates aria-valuetext and the readout on input without committing', () => {
		const set = vi.fn();
		const node = rangeField('Master volume', { get: () => 0.65, set, min: 0, max: 1, step: 0.05, format: percent });
		const input = node.querySelector('input');
		input.value = '0.4';
		input.dispatchEvent(new Event('input'));
		expect(input.getAttribute('aria-valuetext')).toBe('40 percent');
		expect(node.querySelector('span').textContent).toBe('40 percent');
		expect(set).not.toHaveBeenCalled();
	});

	test('commits a number on change', () => {
		const set = vi.fn();
		const node = rangeField('Master volume', { get: () => 0.65, set, min: 0, max: 1, step: 0.05 });
		const input = node.querySelector('input');
		input.value = '0.4';
		input.dispatchEvent(new Event('change'));
		expect(set).toHaveBeenCalledWith(0.4, undefined);
	});

	test('hands format a number while dragging', () => {
		const node = rangeField('Master volume', { get: () => 0.65, set: () => {}, min: 0, max: 1, step: 0.05, format: v => v.toFixed(1) });
		const input = node.querySelector('input');
		input.value = '0.4';
		input.dispatchEvent(new Event('input'));
		expect(input.getAttribute('aria-valuetext')).toBe('0.4');
		expect(node.querySelector('span').textContent).toBe('0.4');
	});

	test('omits aria-valuetext and the readout when format is absent', () => {
		const node = rangeField('Master volume', { get: () => 0.65, set: () => {}, min: 0, max: 1, step: 0.05 });
		expect(node.querySelector('input').hasAttribute('aria-valuetext')).toBe(false);
		expect(node.querySelector('span')).toBe(null);
	});
});

describe('fields: percentRangeField', () => {
	test('presets the range and formats as a percentage', () => {
		const node = percentRangeField('Music volume', { get: () => 0.6, set: () => {} });
		const input = node.querySelector('input');
		expect(input.getAttribute('min')).toBe('0');
		expect(input.getAttribute('max')).toBe('1');
		expect(input.getAttribute('step')).toBe('0.05');
		expect(input.getAttribute('aria-valuetext')).toBe('60 percent');
	});
});

const DIFFICULTIES = [
	{ value: 'story', label: 'Story' },
	{ value: 'normal', label: 'Normal' },
	{ value: 'veteran', label: 'Veteran' },
];

describe('fields: selectField', () => {
	test('renders every choice and marks the current one', () => {
		const node = selectField('Difficulty', { get: () => 'normal', set: () => {}, choices: DIFFICULTIES });
		const options = [...node.querySelectorAll('option')];
		expect(options.map(o => o.getAttribute('value'))).toEqual(['story', 'normal', 'veteran']);
		expect(options.map(o => o.textContent)).toEqual(['Story', 'Normal', 'Veteran']);
		expect(options.filter(o => o.hasAttribute('selected')).map(o => o.getAttribute('value'))).toEqual(['normal']);
	});

	test('pairs the label with the select', () => {
		const node = selectField('Difficulty', { get: () => 'normal', set: () => {}, choices: DIFFICULTIES });
		const select = node.querySelector('select');
		expect(node.querySelector('label').getAttribute('for')).toBe(select.getAttribute('id'));
	});

	test('commits the chosen value on change', () => {
		const set = vi.fn();
		const node = selectField('Difficulty', { get: () => 'normal', set, choices: DIFFICULTIES });
		const select = node.querySelector('select');
		select.value = 'veteran';
		select.dispatchEvent(new Event('change'));
		expect(set).toHaveBeenCalledWith('veteran', 'Veteran');
	});

	test('hands a caller-supplied set the display string as well as the value', () => {
		const set = vi.fn();
		const node = selectField('Difficulty', { get: () => 'normal', set, choices: DIFFICULTIES });
		const select = node.querySelector('select');
		select.value = 'story';
		select.dispatchEvent(new Event('change'));
		expect(set.mock.calls[0]).toEqual(['story', 'Story']);
	});

	test('commits the original choice value, not the DOM string', () => {
		const set = vi.fn();
		const choices = [{ value: 1, label: 'Easy' }, { value: 2, label: 'Hard' }];
		const node = selectField('Level', { get: () => 1, set, choices });
		const select = node.querySelector('select');
		select.value = '2';
		select.dispatchEvent(new Event('change'));
		expect(set).toHaveBeenCalledWith(2, 'Hard');
	});

	test('marks the selected option on a re-render seeded with a number', () => {
		const choices = [{ value: 1, label: 'Easy' }, { value: 2, label: 'Hard' }];
		const node = selectField('Level', { get: () => 2, set: () => {}, choices });
		const selected = [...node.querySelectorAll('option')].filter(o => o.hasAttribute('selected'));
		expect(selected.map(o => o.getAttribute('value'))).toEqual(['2']);
	});
});

describe('fields: checkboxField', () => {
	test('reflects the current boolean', () => {
		const on = checkboxField('Permadeath', { get: () => true, set: () => {} });
		const off = checkboxField('Permadeath', { get: () => false, set: () => {} });
		expect(on.querySelector('input').hasAttribute('checked')).toBe(true);
		expect(off.querySelector('input').hasAttribute('checked')).toBe(false);
	});

	test('puts the label after the control', () => {
		const node = checkboxField('Permadeath', { get: () => false, set: () => {} });
		expect(node.getAttribute('class')).toBe('field check');
		expect(node.firstChild.tagName).toBe('INPUT');
		expect(node.children[1].tagName).toBe('LABEL');
		expect(node.querySelector('label').getAttribute('for')).toBe(node.querySelector('input').getAttribute('id'));
	});

	test('commits a boolean on change', () => {
		const set = vi.fn();
		const node = checkboxField('Permadeath', { get: () => false, set });
		const input = node.querySelector('input');
		input.checked = true;
		input.dispatchEvent(new Event('change'));
		expect(set).toHaveBeenCalledWith(true, 'on');
	});

	test('works with a set that takes only a value', () => {
		let committed = null;
		const node = checkboxField('Permadeath', { get: () => false, set: (value) => { committed = value; } });
		const input = node.querySelector('input');
		input.checked = true;
		input.dispatchEvent(new Event('change'));
		expect(committed).toBe(true);
	});
});

const MOVEMENT = [
	{ value: 'strafe', label: 'Strafe with arrows' },
	{ value: 'turn', label: 'Turn with arrows' },
	{ value: 'grid', label: 'Grid steps' },
];

const ANNOUNCEMENTS = [
	{ value: 'health', label: 'Health changes' },
	{ value: 'ammo', label: 'Ammunition' },
	{ value: 'radar', label: 'Radar contacts' },
];

describe('fields: radioGroup', () => {
	test('renders a fieldset with a legend and one radio per choice', () => {
		const node = radioGroup('Movement scheme', { get: () => 'turn', set: () => {}, choices: MOVEMENT });
		expect(node.tagName).toBe('FIELDSET');
		expect(node.querySelector('legend').textContent).toBe('Movement scheme');
		const inputs = [...node.querySelectorAll('input')];
		expect(inputs).toHaveLength(3);
		expect(inputs.every(i => i.getAttribute('type') === 'radio')).toBe(true);
	});

	test('shares one name and pairs every label', () => {
		const node = radioGroup('Movement scheme', { get: () => 'turn', set: () => {}, choices: MOVEMENT });
		const inputs = [...node.querySelectorAll('input')];
		const names = new Set(inputs.map(i => i.getAttribute('name')));
		expect(names.size).toBe(1);
		for (const input of inputs) {
			const label = node.querySelector(`label[for="${input.getAttribute('id')}"]`);
			expect(label).not.toBe(null);
		}
	});

	test('checks the current choice only', () => {
		const node = radioGroup('Movement scheme', { get: () => 'turn', set: () => {}, choices: MOVEMENT });
		const checked = [...node.querySelectorAll('input')].filter(i => i.hasAttribute('checked'));
		expect(checked.map(i => i.getAttribute('value'))).toEqual(['turn']);
	});

	test('commits the chosen value and ignores the deselect event', () => {
		const set = vi.fn();
		const node = radioGroup('Movement scheme', { get: () => 'turn', set, choices: MOVEMENT });
		const [strafe, turn] = [...node.querySelectorAll('input')];
		turn.checked = false;
		turn.dispatchEvent(new Event('change'));
		expect(set).not.toHaveBeenCalled();
		strafe.checked = true;
		strafe.dispatchEvent(new Event('change'));
		expect(set).toHaveBeenCalledWith('strafe', 'Strafe with arrows');
	});

	test('autoFocus lands on the first item only', () => {
		const node = radioGroup('Movement scheme', { get: () => 'turn', set: () => {}, choices: MOVEMENT, autoFocus: true });
		const flagged = [...node.querySelectorAll('input')].filter(i => i.dataset.autofocus === 'true');
		expect(flagged.map(i => i.getAttribute('value'))).toEqual(['strafe']);
	});

	test('describes the fieldset with the hint', () => {
		const node = radioGroup('Movement scheme', { get: () => 'turn', set: () => {}, choices: MOVEMENT, hint: 'Changes how arrows behave.' });
		const hint = node.querySelector('p.hint');
		expect(node.getAttribute('aria-describedby')).toBe(hint.getAttribute('id'));
	});

	test('describes every radio with the hint', () => {
		const node = radioGroup('Movement scheme', { get: () => 'turn', set: () => {}, choices: MOVEMENT, hint: 'Changes how arrows behave.' });
		const hintId = node.querySelector('p.hint').getAttribute('id');
		for (const input of node.querySelectorAll('input')) {
			expect(input.getAttribute('aria-describedby')).toBe(hintId);
		}
	});
});

describe('fields: checkboxGroup', () => {
	test('checks the values present in the array', () => {
		const node = checkboxGroup('Speak these events', { get: () => ['health', 'radar'], set: () => {}, choices: ANNOUNCEMENTS });
		const checked = [...node.querySelectorAll('input')].filter(i => i.hasAttribute('checked'));
		expect(checked.map(i => i.getAttribute('value'))).toEqual(['health', 'radar']);
	});

	test('adds a value and always commits an array', () => {
		const set = vi.fn();
		const node = checkboxGroup('Speak these events', { get: () => ['health'], set, choices: ANNOUNCEMENTS });
		const ammo = node.querySelector('input[value="ammo"]');
		ammo.checked = true;
		ammo.dispatchEvent(new Event('change'));
		expect(set).toHaveBeenCalledWith(['health', 'ammo'], 'Ammunition on');
	});

	test('removes a value', () => {
		const set = vi.fn();
		const node = checkboxGroup('Speak these events', { get: () => ['health', 'ammo'], set, choices: ANNOUNCEMENTS });
		const health = node.querySelector('input[value="health"]');
		health.checked = false;
		health.dispatchEvent(new Event('change'));
		expect(set).toHaveBeenCalledWith(['ammo'], 'Health changes off');
	});

	test('describes every checkbox with the hint', () => {
		const node = checkboxGroup('Speak these events', { get: () => [], set: () => {}, choices: ANNOUNCEMENTS, hint: 'Pick what gets spoken.' });
		const hintId = node.querySelector('p.hint').getAttribute('id');
		for (const input of node.querySelectorAll('input')) {
			expect(input.getAttribute('aria-describedby')).toBe(hintId);
		}
	});
});

describe('fields: keyField', () => {
	test('humanizes the bound key in the button label', () => {
		expect(keyName(' ')).toBe('Space');
		expect(keyName('Escape')).toBe('Escape');
		const node = keyField('Fire', { get: () => ' ', set: () => {} });
		expect(node.querySelector('button').textContent).toBe('Fire: Space');
	});

	test('prompts while capturing', () => {
		const node = keyField('Fire', { get: () => ' ', set: () => {} });
		const button = node.querySelector('button');
		document.body.appendChild(node);
		button.dispatchEvent(new Event('click'));
		expect(button.textContent).toBe('Fire: press a key, or escape to cancel');
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		node.remove();
	});

	test('stops the captured key reaching a window listener', () => {
		const set = vi.fn();
		const game = vi.fn();
		const node = keyField('Fire', { get: () => ' ', set });
		const button = node.querySelector('button');
		document.body.appendChild(node);
		window.addEventListener('keydown', game);
		try {
			button.dispatchEvent(new Event('click'));
			document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }));
			expect(set).toHaveBeenCalledWith('f', 'f');
			expect(game).not.toHaveBeenCalled();
		} finally {
			window.removeEventListener('keydown', game);
			node.remove();
		}
	});

	test('applies disabled', () => {
		const node = keyField('Fire', { get: () => ' ', set: () => {}, disabled: true });
		expect(node.querySelector('button').hasAttribute('disabled')).toBe(true);
	});

	test('commits the pressed key and stops listening', () => {
		const set = vi.fn();
		const node = keyField('Fire', { get: () => ' ', set });
		const button = node.querySelector('button');
		document.body.appendChild(node);
		button.dispatchEvent(new Event('click'));
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
		expect(set).toHaveBeenCalledWith('f', 'f');
		expect(button.textContent).toBe('Fire: f');
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
		expect(set).toHaveBeenCalledTimes(1);
	});

	test('escape cancels without committing', () => {
		const set = vi.fn();
		const node = keyField('Fire', { get: () => ' ', set });
		const button = node.querySelector('button');
		document.body.appendChild(node);
		button.dispatchEvent(new Event('click'));
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		expect(set).not.toHaveBeenCalled();
		expect(button.textContent).toBe('Fire: Space');
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
		expect(set).not.toHaveBeenCalled();
		expect(button.textContent).toBe('Fire: Space');
	});

	test('does not capture before the button is pressed', () => {
		const set = vi.fn();
		keyField('Fire', { get: () => ' ', set });
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }));
		expect(set).not.toHaveBeenCalled();
	});

	test('ignores a keydown after the button is removed from the document', () => {
		const set = vi.fn();
		const node = keyField('Fire', { get: () => ' ', set });
		const button = node.querySelector('button');
		document.body.appendChild(node);
		button.dispatchEvent(new Event('click'));
		node.remove();
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
		expect(set).not.toHaveBeenCalled();
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
		expect(set).not.toHaveBeenCalled();
	});
});

describe('fields: confirmButton', () => {
	test('arms on the first press without firing', () => {
		const onConfirm = vi.fn();
		const button = confirmButton('Reset everything to defaults', {
			confirmLabel: 'Press again to confirm reset',
			onConfirm,
		});
		expect(button.tagName).toBe('BUTTON');
		expect(button.textContent).toBe('Reset everything to defaults');
		button.dispatchEvent(new Event('click'));
		expect(onConfirm).not.toHaveBeenCalled();
		expect(button.textContent).toBe('Press again to confirm reset');
		expect(button.dataset.armed).toBe('true');
	});

	test('fires on the second press and disarms', () => {
		const onConfirm = vi.fn();
		const button = confirmButton('Reset', { confirmLabel: 'Press again', onConfirm });
		button.dispatchEvent(new Event('click'));
		button.dispatchEvent(new Event('click'));
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(button.textContent).toBe('Reset');
		expect(button.dataset.armed).toBe('false');
	});

	test('needs two presses again after firing', () => {
		const onConfirm = vi.fn();
		const button = confirmButton('Reset', { confirmLabel: 'Press again', onConfirm });
		button.dispatchEvent(new Event('click'));
		button.dispatchEvent(new Event('click'));
		button.dispatchEvent(new Event('click'));
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(button.textContent).toBe('Press again');
	});

	test('applies disabled and autoFocus', () => {
		const button = confirmButton('Reset', { confirmLabel: 'Press again', onConfirm: () => {}, disabled: true, autoFocus: true });
		expect(button.hasAttribute('disabled')).toBe(true);
		expect(button.dataset.autofocus).toBe('true');
	});
});

function memoryStorage() {
	const map = new Map();
	return createStorage('test', {
		backend: {
			getItem: (k) => (map.has(k) ? map.get(k) : null),
			setItem: (k, v) => map.set(k, v),
			removeItem: (k) => map.delete(k),
		},
	});
}

describe('fields: createFields', () => {
	test('reads the default when storage is empty', () => {
		const f = createFields({ storage: memoryStorage(), defaults: { name: 'Pilot' } });
		const node = f.text('name', 'Player name');
		expect(node.querySelector('input').getAttribute('value')).toBe('Pilot');
	});

	test('reads a stored value over the default', () => {
		const storage = memoryStorage();
		storage.set('name', 'Falcon');
		const f = createFields({ storage, defaults: { name: 'Pilot' } });
		expect(f.text('name', 'Player name').querySelector('input').getAttribute('value')).toBe('Falcon');
	});

	test('writes through to storage on change', () => {
		const storage = memoryStorage();
		const f = createFields({ storage, defaults: { name: 'Pilot' } });
		const input = f.text('name', 'Player name').querySelector('input');
		input.value = 'Nomad';
		input.dispatchEvent(new Event('change'));
		expect(storage.get('name')).toBe('Nomad');
	});

	test('calls onChange with one object describing the change, after the write', () => {
		const storage = memoryStorage();
		const onChange = vi.fn(({ key }) => expect(storage.get(key)).toBe(0.4));
		const f = createFields({ storage, defaults: { masterVolume: 1 }, onChange });
		const input = f.percentRange('masterVolume', 'Master volume').querySelector('input');
		input.value = '0.4';
		input.dispatchEvent(new Event('change'));
		expect(onChange).toHaveBeenCalledWith({
			key: 'masterVolume',
			value: 0.4,
			label: 'Master volume',
			display: '40 percent',
			type: 'percentRange',
			message: 'Master volume 40 percent',
		});
	});

	test('a checkbox announces on and off', () => {
		const onChange = vi.fn();
		const f = createFields({ storage: memoryStorage(), defaults: { footsteps: true }, onChange });
		const input = f.checkbox('footsteps', 'Footstep sounds').querySelector('input');
		input.checked = false;
		input.dispatchEvent(new Event('change'));
		expect(onChange).toHaveBeenCalledWith({
			key: 'footsteps',
			value: false,
			label: 'Footstep sounds',
			display: 'off',
			type: 'checkbox',
			message: 'Footstep sounds off',
		});
		input.checked = true;
		input.dispatchEvent(new Event('change'));
		expect(onChange).toHaveBeenLastCalledWith({
			key: 'footsteps',
			value: true,
			label: 'Footstep sounds',
			display: 'on',
			type: 'checkbox',
			message: 'Footstep sounds on',
		});
	});

	test('a select announces the choice label, not its value', () => {
		const onChange = vi.fn();
		const f = createFields({ storage: memoryStorage(), defaults: { region: 'auto' }, onChange });
		const select = f.select('region', 'Server region', {
			choices: [{ value: 'auto', label: 'Automatic' }, { value: 'eu', label: 'Europe' }],
		}).querySelector('select');
		select.value = 'eu';
		select.dispatchEvent(new Event('change'));
		expect(onChange).toHaveBeenCalledWith({
			key: 'region',
			value: 'eu',
			label: 'Server region',
			display: 'Europe',
			type: 'select',
			message: 'Server region Europe',
		});
	});

	test('a checkbox group announces only what toggled', () => {
		const onChange = vi.fn();
		const f = createFields({ storage: memoryStorage(), defaults: { announcements: ['health'] }, onChange });
		const node = f.checkboxGroup('announcements', 'Speak these events', { choices: ANNOUNCEMENTS });
		const ammo = node.querySelector('input[value="ammo"]');
		ammo.checked = true;
		ammo.dispatchEvent(new Event('change'));
		expect(onChange).toHaveBeenCalledWith({
			key: 'announcements',
			value: ['health', 'ammo'],
			label: 'Speak these events',
			display: 'Ammunition on',
			type: 'checkboxGroup',
			message: 'Ammunition on',
		});
		const health = node.querySelector('input[value="health"]');
		health.checked = false;
		health.dispatchEvent(new Event('change'));
		expect(onChange).toHaveBeenLastCalledWith({
			key: 'announcements',
			value: ['ammo'],
			label: 'Speak these events',
			display: 'Health changes off',
			type: 'checkboxGroup',
			message: 'Health changes off',
		});
	});

	test('a key field announces the humanized key', () => {
		const onChange = vi.fn();
		const f = createFields({ storage: memoryStorage(), defaults: { fireKey: 'f' }, onChange });
		const node = f.key('fireKey', 'Fire');
		document.body.appendChild(node);
		node.querySelector('button').dispatchEvent(new Event('click'));
		document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
		node.remove();
		expect(onChange).toHaveBeenCalledWith({
			key: 'fireKey',
			value: ' ',
			label: 'Fire',
			display: 'Space',
			type: 'key',
			message: 'Fire bound to Space',
		});
	});

	test('a text area announces that it saved', () => {
		const onChange = vi.fn();
		const f = createFields({ storage: memoryStorage(), defaults: { greeting: '' }, onChange });
		const area = f.textArea('greeting', 'Greeting').querySelector('textarea');
		area.value = 'Good hunting.';
		area.dispatchEvent(new Event('change'));
		expect(onChange).toHaveBeenCalledWith({
			key: 'greeting',
			value: 'Good hunting.',
			label: 'Greeting',
			display: 'saved',
			type: 'textArea',
			message: 'Greeting saved',
		});
	});

	test('display falls back to the value for a plain text field', () => {
		const onChange = vi.fn();
		const f = createFields({ storage: memoryStorage(), defaults: { name: '' }, onChange });
		const input = f.text('name', 'Player name').querySelector('input');
		input.value = 'Nomad';
		input.dispatchEvent(new Event('change'));
		expect(onChange).toHaveBeenCalledWith({
			key: 'name',
			value: 'Nomad',
			label: 'Player name',
			display: 'Nomad',
			type: 'text',
			message: 'Player name Nomad',
		});
	});

	test('type lets a caller phrase announcements without the built-in message', () => {
		const spoken = [];
		const phrase = ({ type, label, display }) => {
			if (type === 'key') return `Press ${display} for ${label}`;
			if (type === 'checkboxGroup') return `${label}: ${display}`;
			return `${label} ${display}`;
		};
		const f = createFields({
			storage: memoryStorage(),
			defaults: { fireKey: 'f', announcements: ['health'] },
			onChange: (change) => spoken.push(phrase(change)),
		});
		const key = f.key('fireKey', 'Fire');
		document.body.appendChild(key);
		key.querySelector('button').dispatchEvent(new Event('click'));
		document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
		key.remove();
		const group = f.checkboxGroup('announcements', 'Speak these events', { choices: ANNOUNCEMENTS });
		const ammo = group.querySelector('input[value="ammo"]');
		ammo.checked = true;
		ammo.dispatchEvent(new Event('change'));
		expect(spoken).toEqual(['Press Space for Fire', 'Speak these events: Ammunition on']);
	});

	test('derives a stable id from the key', () => {
		const f = createFields({ storage: memoryStorage(), defaults: { name: 'Pilot' } });
		expect(f.text('name', 'Player name').querySelector('input').getAttribute('id')).toBe('field-name');
		expect(f.text('name', 'Player name').querySelector('input').getAttribute('id')).toBe('field-name');
	});

	test('passes type-specific options through', () => {
		const f = createFields({ storage: memoryStorage(), defaults: { turnStep: 15 } });
		const input = f.number('turnStep', 'Turn step', { min: 5, max: 90, step: 5 }).querySelector('input');
		expect(input.getAttribute('min')).toBe('5');
		expect(input.getAttribute('max')).toBe('90');
	});

	test('works without an onChange hook', () => {
		const storage = memoryStorage();
		const f = createFields({ storage, defaults: { footsteps: true } });
		const input = f.checkbox('footsteps', 'Footstep sounds').querySelector('input');
		input.checked = false;
		input.dispatchEvent(new Event('change'));
		expect(storage.get('footsteps')).toBe(false);
	});

	test('requires a storage instance', () => {
		expect(() => createFields({})).toThrow('createFields requires a storage instance');
	});
});
