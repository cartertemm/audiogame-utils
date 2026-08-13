import { describe, test, expect, afterEach } from 'vitest';
import { isIOS, isIOSStandalone } from '../src/platform.js';

function setUA(value) {
	Object.defineProperty(window.navigator, 'userAgent', {
		value,
		configurable: true,
	});
}

function setMaxTouchPoints(value) {
	Object.defineProperty(window.navigator, 'maxTouchPoints', {
		value,
		configurable: true,
	});
}

describe('platform: isIOS', () => {
	afterEach(() => {
		setUA('');
		setMaxTouchPoints(0);
	});

	test('detects iPhone', () => {
		setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
		expect(isIOS()).toBe(true);
	});

	test('detects iPad', () => {
		setUA('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
		expect(isIOS()).toBe(true);
	});

	test('detects iPadOS 13+ posing as Macintosh with touch', () => {
		setUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15');
		setMaxTouchPoints(5);
		expect(isIOS()).toBe(true);
	});

	test('returns false for a desktop Mac without touch', () => {
		setUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15');
		setMaxTouchPoints(0);
		expect(isIOS()).toBe(false);
	});

	test('returns false for Android', () => {
		setUA('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36');
		expect(isIOS()).toBe(false);
	});
});

describe('platform: isIOSStandalone', () => {
	afterEach(() => {
		delete window.navigator.standalone;
		setUA('');
	});

	test('returns true when on iOS and navigator.standalone is true', () => {
		setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
		Object.defineProperty(window.navigator, 'standalone', {
			value: true,
			configurable: true,
		});
		expect(isIOSStandalone()).toBe(true);
	});

	test('returns false when navigator.standalone is undefined', () => {
		setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
		expect(isIOSStandalone()).toBe(false);
	});

	test('returns false when navigator.standalone is false', () => {
		setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
		Object.defineProperty(window.navigator, 'standalone', {
			value: false,
			configurable: true,
		});
		expect(isIOSStandalone()).toBe(false);
	});

	test('returns false on non-iOS even if standalone is spoofed', () => {
		setUA('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36');
		Object.defineProperty(window.navigator, 'standalone', {
			value: true,
			configurable: true,
		});
		expect(isIOSStandalone()).toBe(false);
	});
});
