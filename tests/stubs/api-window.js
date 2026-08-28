// Stands in for `@tauri-apps/api/window` under test.

export const calls = { title: null, fullscreen: false, closed: false, closeHandler: null };

export function reset() {
	calls.title = null;
	calls.fullscreen = false;
	calls.closed = false;
	calls.closeHandler = null;
}

export function getCurrentWindow() {
	return {
		async setTitle(text) {
			calls.title = text;
		},
		async setFullscreen(on) {
			calls.fullscreen = on;
		},
		async isFullscreen() {
			return calls.fullscreen;
		},
		async close() {
			calls.closed = true;
		},
		async onCloseRequested(handler) {
			calls.closeHandler = handler;
			return () => {
				calls.closeHandler = null;
			};
		},
	};
}
