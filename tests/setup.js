// Provide `speechSynthesis` because happy-dom does not implement it.
class MockUtterance {
	constructor(text) {
		this.text = text;
	}
}

// Extend `EventTarget` so tests can dispatch the `voiceschanged` event.
class MockSpeechSynthesis extends EventTarget {
	constructor() {
		super();
		this.spoken = [];
		this.cancelCalls = 0;
		this.voices = [];
	}
	speak(utterance) {
		this.spoken.push(utterance.text);
	}
	cancel() {
		this.cancelCalls += 1;
	}
	getVoices() {
		return this.voices;
	}
	reset() {
		this.spoken = [];
		this.cancelCalls = 0;
		this.voices = [];
	}
}

globalThis.SpeechSynthesisUtterance = MockUtterance;
globalThis.speechSynthesis = new MockSpeechSynthesis();

// Provide an in-memory `localStorage` implementation. The experimental global
// in Node.js 22 and later can hide happy-dom's implementation without providing
// the required Storage methods.
class MockStorage {
	constructor() {
		this.store = {};
	}
	get length() {
		return Object.keys(this.store).length;
	}
	key(index) {
		const keys = Object.keys(this.store);
		return index < keys.length ? keys[index] : null;
	}
	getItem(name) {
		return Object.prototype.hasOwnProperty.call(this.store, name) ? this.store[name] : null;
	}
	setItem(name, value) {
		this.store[name] = String(value);
	}
	removeItem(name) {
		delete this.store[name];
	}
	clear() {
		this.store = {};
	}
}

const mockLocalStorage = new MockStorage();
Object.defineProperty(globalThis, 'localStorage', {
	value: mockLocalStorage,
	writable: true,
	configurable: true,
});
if (typeof window !== 'undefined') {
	Object.defineProperty(window, 'localStorage', {
		value: mockLocalStorage,
		writable: true,
		configurable: true,
	});
}

// Reset shared state before each test.
import { beforeEach } from 'vitest';
beforeEach(() => {
	globalThis.speechSynthesis.reset();
	document.body.innerHTML = '';
	localStorage.clear();
});
