// @ts-self-types="./window.d.ts"
// Operations with no web equivalent return `false` rather than throwing.

import { capability } from './platform.js';

let wakeLock = null;

export const webWindow = {
	setTitle(text) {
		if (typeof document === 'undefined') return false;
		document.title = text;
		return true;
	},

	async setFullscreen(on) {
		if (typeof document === 'undefined') return false;
		try {
			if (on) await document.documentElement.requestFullscreen();
			else if (document.fullscreenElement) await document.exitFullscreen();
			return true;
		} catch {
			return false;
		}
	},

	async isFullscreen() {
		return typeof document !== 'undefined' && Boolean(document.fullscreenElement);
	},

	async toggleFullscreen() {
		return webWindow.setFullscreen(!(await webWindow.isFullscreen()));
	},

	async quit() {
		return false;
	},

	// Browsers show their own wording and ignore the handler's message, so a game
	// cannot speak a confirmation here the way it can on the desktop.
	onCloseRequest(handler) {
		if (typeof window === 'undefined') return () => {};
		const listener = event => {
			if (handler() === false) event.preventDefault();
		};
		window.addEventListener('beforeunload', listener);
		return () => window.removeEventListener('beforeunload', listener);
	},

	async keepAwake(on) {
		if (typeof navigator === 'undefined' || !navigator.wakeLock) return false;
		try {
			if (on) {
				wakeLock ??= await navigator.wakeLock.request('screen');
			} else {
				await wakeLock?.release();
				wakeLock = null;
			}
			return true;
		} catch {
			return false;
		}
	},

	async openUrl(url) {
		if (typeof window === 'undefined') return false;
		window.open(url, '_blank', 'noopener');
		return true;
	},
};

function impl() {
	return capability('window') ?? webWindow;
}

export function setTitle(text) {
	return impl().setTitle(text);
}

export function setFullscreen(on) {
	return impl().setFullscreen(on);
}

export function isFullscreen() {
	return impl().isFullscreen();
}

export function toggleFullscreen() {
	return impl().toggleFullscreen();
}

export function quit() {
	return impl().quit();
}

export function onCloseRequest(handler) {
	return impl().onCloseRequest(handler);
}

export function keepAwake(on) {
	return impl().keepAwake(on);
}

export function openUrl(url) {
	return impl().openUrl(url);
}
