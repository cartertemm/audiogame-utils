import { describe, test, expect } from 'vitest';
import { ramp_param } from '../src/audio/ramp.js';

function makeFakeParam(value = 1) {
	return {
		value,
		calls: [],
		cancelScheduledValues(t) { this.calls.push(['cancel', t]); },
		setValueAtTime(v, t) { this.calls.push(['set', v, t]); this.value = v; },
		linearRampToValueAtTime(v, t) { this.calls.push(['ramp', v, t]); this.value = v; },
	};
}

describe('ramp_param', () => {
	test('pins the current value then ramps over the duration', () => {
		const param = makeFakeParam(1);
		ramp_param(param, 0.25, 2, { currentTime: 10 });
		expect(param.calls).toEqual([['cancel', 10], ['set', 1, 10], ['ramp', 0.25, 12]]);
		expect(param.value).toBe(0.25);
	});

	test('sets at once when the duration is zero', () => {
		const param = makeFakeParam(1);
		ramp_param(param, 0.5, 0, { currentTime: 3 });
		expect(param.calls).toEqual([['cancel', 3], ['set', 0.5, 3]]);
	});
});
