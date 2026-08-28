// @ts-self-types="./window.d.ts"

import { getCurrentWindow } from '@tauri-apps/api/window';
import { webWindow } from '../window.js';

export function createTauriWindow() {
	const win = getCurrentWindow();

	return {
		// `keepAwake` is inherited. Every Tauri webview supports the Screen Wake
		// Lock API, so the web implementation is already correct here.
		...webWindow,

		async setTitle(text) {
			await win.setTitle(text);
			return true;
		},

		async setFullscreen(on) {
			await win.setFullscreen(on);
			return true;
		},

		isFullscreen() {
			return win.isFullscreen();
		},

		async toggleFullscreen() {
			await win.setFullscreen(!(await win.isFullscreen()));
			return true;
		},

		async quit() {
			await win.close();
			return true;
		},

		onCloseRequest(handler) {
			let unlisten = () => {};
			win.onCloseRequested(event => {
				if (handler() === false) event.preventDefault();
			}).then(fn => {
				unlisten = fn;
			});
			return () => unlisten();
		},

		// A missing opener plugin must not make a help link fatal.
		async openUrl(url) {
			try {
				const { openUrl } = await import('@tauri-apps/plugin-opener');
				await openUrl(url);
				return true;
			} catch {
				return webWindow.openUrl(url);
			}
		},
	};
}
