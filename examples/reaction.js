// A reaction time test. Each round waits a random amount of time, plays a beep,
// and measures how long the player takes to press space or enter.

import { createStorage } from '../src/storage.js';
import { createSpeech } from '../src/speech/index.js';
import { createKeyboard } from '../src/input/index.js';
import { createFocusTrap } from '../src/focus.js';
import { createAudio } from '../src/audio/index.js';

const ROUNDS = 5;
const PRESS_KEYS = new Set([' ', 'Enter']);
const MIN_WAIT_MS = 1500;
const MAX_WAIT_MS = 4000;
const BETWEEN_ROUNDS_MS = 1200;
const BEEP_VOLUME = 0.6;

const storage = createStorage('audiogame-utils-examples');
const speech = createSpeech({ storage });
const keyboard = createKeyboard();
const audio = createAudio();
const beep = audio.sfx('./sounds/beep.wav');

const startButton = document.getElementById('start');
const game = document.getElementById('game');
const status = document.getElementById('status');
const results = document.getElementById('results');

let armed = false;
let pressResolve = null;

function announce(text) {
	status.textContent = text;
	speech.speak(text, true);
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function nextPress() {
	return new Promise(resolve => {
		pressResolve = time => {
			pressResolve = null;
			resolve(time);
		};
	});
}

keyboard.on('keypress', event => {
	if (!PRESS_KEYS.has(event.key) || !armed) return;
	// Stop the page from scrolling and from reactivating the start button.
	event.preventDefault();
	pressResolve?.(performance.now());
});

function addResult(text) {
	const line = document.createElement('li');
	line.textContent = text;
	results.appendChild(line);
}

async function runRound(number) {
	announce(`Round ${number} of ${ROUNDS}. Wait for the beep.`);
	armed = true;
	const press = nextPress();
	const wait = MIN_WAIT_MS + Math.random() * (MAX_WAIT_MS - MIN_WAIT_MS);
	const early = await Promise.race([press, sleep(wait).then(() => null)]);
	if (early !== null) {
		armed = false;
		announce('Too early. Repeating the round.');
		await sleep(BETWEEN_ROUNDS_MS);
		return null;
	}
	await beep.play({ volume: BEEP_VOLUME });
	const beepAt = performance.now();
	const pressedAt = await press;
	armed = false;
	return Math.round(pressedAt - beepAt);
}

async function play() {
	results.textContent = '';
	const times = [];
	const trap = createFocusTrap(game, { label: 'Reaction test' });
	for (let round = 1; round <= ROUNDS; round++) {
		let ms = null;
		while (ms === null) ms = await runRound(round);
		times.push(ms);
		addResult(`Round ${round}: ${ms} ms`);
		announce(`${ms} milliseconds.`);
		await sleep(BETWEEN_ROUNDS_MS);
	}
	const average = Math.round(times.reduce((total, ms) => total + ms, 0) / times.length);
	addResult(`Average: ${average} ms`);
	trap.release();
	announce(`Test complete. Your average is ${average} milliseconds. Press start to try again.`);
}

startButton.addEventListener('click', async () => {
	startButton.disabled = true;
	// Some browsers (iOS Safari) only allow audio and text to speech to start from a user gesture.
	// Decoding the beep now also keeps load time out of the first measurement.
	speech.primeTts();
	try {
		await audio.preload();
		await play();
	} finally {
		startButton.disabled = false;
		startButton.focus();
	}
});
