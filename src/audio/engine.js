import { createCacophonyEngine } from './cacophony.js';

let shared = null;
let checked = false;

export function audio_available() {
	return typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined';
}

// One engine per page. Browsers cap how many audio contexts a page may open, and
// listener state is global, so every module here shares a single instance.
export function get_shared_engine() {
	if (checked) return shared;
	checked = true;
	shared = audio_available() ? createCacophonyEngine() : null;
	return shared;
}
