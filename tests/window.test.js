import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { webWindow, setTitle, quit, isFullscreen, openUrl } from '../src/window.js';
import { createTauriWindow } from '../src/tauri/window.js';
import { register, resetCapabilities } from '../src/platform.js';
import { calls, reset } from './stubs/api-window.js';

describe('web window control', () => {
	beforeEach(resetCapabilities);
	afterEach(() => {
		resetCapabilities();
		vi.restoreAllMocks();
	});

	test('setTitle writes the document title', () => {
		expect(setTitle('My game')).toBe(true);
		expect(document.title).toBe('My game');
	});

	test('quit resolves false because a page cannot close itself', async () => {
		await expect(quit()).resolves.toBe(false);
	});

	test('isFullscreen is false with no fullscreen element', async () => {
		await expect(isFullscreen()).resolves.toBe(false);
	});

	test('setFullscreen resolves false when the request is refused', async () => {
		document.documentElement.requestFullscreen = () => Promise.reject(new Error('denied'));
		await expect(webWindow.setFullscreen(true)).resolves.toBe(false);
		delete document.documentElement.requestFullscreen;
	});

	test('setFullscreen resolves true when the request is granted', async () => {
		document.documentElement.requestFullscreen = () => Promise.resolve();
		await expect(webWindow.setFullscreen(true)).resolves.toBe(true);
		delete document.documentElement.requestFullscreen;
	});

	test('keepAwake resolves false without the Wake Lock API', async () => {
		await expect(webWindow.keepAwake(true)).resolves.toBe(false);
	});

	test('openUrl opens a new tab', async () => {
		const open = vi.spyOn(window, 'open').mockImplementation(() => null);
		await expect(openUrl('https://example.com')).resolves.toBe(true);
		expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener');
	});

	test('onCloseRequest returns a function that removes the listener', () => {
		const remove = vi.spyOn(window, 'removeEventListener');
		webWindow.onCloseRequest(() => true)();
		expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function));
	});
});

describe('tauri window control', () => {
	beforeEach(() => {
		reset();
		resetCapabilities();
	});

	afterEach(resetCapabilities);

	test('registered native control takes over the module functions', async () => {
		register('window', createTauriWindow());
		await setTitle('Native title');
		expect(calls.title).toBe('Native title');
		expect(document.title).not.toBe('Native title');
	});

	test('quit closes the window', async () => {
		await expect(createTauriWindow().quit()).resolves.toBe(true);
		expect(calls.closed).toBe(true);
	});

	test('toggleFullscreen inverts the current state', async () => {
		const win = createTauriWindow();
		await win.toggleFullscreen();
		expect(calls.fullscreen).toBe(true);
		await win.toggleFullscreen();
		expect(calls.fullscreen).toBe(false);
	});

	test('a handler returning false stops the close', async () => {
		const win = createTauriWindow();
		win.onCloseRequest(() => false);
		await Promise.resolve();
		let prevented = false;
		calls.closeHandler({ preventDefault: () => { prevented = true; } });
		expect(prevented).toBe(true);
	});

	test('keepAwake is inherited from the web implementation', () => {
		expect(createTauriWindow().keepAwake).toBe(webWindow.keepAwake);
	});
});
