import { describe, test, expect, vi } from 'vitest';
import { textField } from '../src/fields.js';

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
