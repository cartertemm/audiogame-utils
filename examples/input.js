// Speaks every keyboard press, swipe, and tap so you can check gesture
// recognition on a real device.

import { createStorage } from '../src/storage.js';
import { createSpeech } from '../src/speech/index.js';
import { createKeyboard, createTouch } from '../src/input/index.js';

const MAX_LOG_LINES = 30;

const storage = createStorage('audiogame-utils-examples');
const speech = createSpeech({ storage });
const keyboard = createKeyboard();
const touch = createTouch();

const log = document.getElementById('log');

// iOS Safari only allows the first speechSynthesis call from inside a user
// gesture, so prime it from the first press or touch of the session.
let primed = false;

function prime() {
	if (primed) return;
	speech.primeTts();
	primed = true;
}

function announce(text, interrupt = false) {
	speech.speak(text, interrupt);
	const line = document.createElement('li');
	line.textContent = text;
	log.prepend(line);
	while (log.children.length > MAX_LOG_LINES) log.lastElementChild.remove();
}

function keyName(key) {
	return key === ' ' ? 'space' : key;
}

function fingerWord(count) {
	const words = { 2: 'two', 3: 'three', 4: 'four', 5: 'five' };
	return count > 1 ? `${words[count] ?? count} finger ` : '';
}

function tapWord(count) {
	const words = { 1: '', 2: 'double ', 3: 'triple ' };
	return words[count] ?? `${count}-`;
}

keyboard.on('keypress', event => {
	prime();
	announce(keyName(event.key));
});

touch.on('touchstart', prime);

touch.on('swipe', event => {
	announce(`${fingerWord(event.fingerCount)}swipe ${event.direction}`, true);
});

touch.on('tap', event => {
	announce(`${fingerWord(event.fingerCount)}${tapWord(event.tapCount)}tap`);
});

announce('Input demo ready. Press a key, swipe, or tap to test.');
