import { describe, test, expect, vi } from 'vitest';
import { textField, passwordField, textAreaField, numberField } from '../src/fields.js';

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
		expect(set).toHaveBeenCalledWith('Good hunting.');
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
