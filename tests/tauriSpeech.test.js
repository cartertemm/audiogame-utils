import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTauriSpeech } from '../src/tauri/speech.js';
import { state, reset } from './stubs/plugin-prism.js';

describe('tauri speech adapter', () => {
	beforeEach(() => {
		reset();
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('returns an adapter with the backend name and features', async () => {
		const speech = await createTauriSpeech();
		expect(speech.backendName).toBe('NVDA');
		expect(speech.features).toEqual({ voice: true, rate: true, pitch: true, volume: true });
	});

	test('returns null and warns when no backend is available', async () => {
		reset({ info: { available: false, backend: null, features: { voice: false, rate: false, pitch: false, volume: false } } });
		expect(await createTauriSpeech()).toBe(null);
		expect(console.warn).toHaveBeenCalledTimes(1);
	});

	test('returns null and names the Rust setup when info rejects', async () => {
		reset({ infoError: new Error('plugin:prism|info not allowed') });
		expect(await createTauriSpeech()).toBe(null);
		expect(console.warn.mock.calls[0][0]).toContain('tauri_plugin_prism::init()');
	});

	test('forwards speak and stop', async () => {
		const speech = await createTauriSpeech();
		await speech.speak('hi', true);
		await speech.stop();
		expect(state.calls).toEqual([['speak', 'hi', true], ['stop']]);
	});

	test('voices use string ids and setVoice converts back', async () => {
		const speech = await createTauriSpeech();
		expect(await speech.voices()).toEqual([{ id: '0', name: 'Zira', language: 'en-US' }]);
		await speech.setVoice('0');
		expect(state.calls).toEqual([['setVoice', 0]]);
	});

	test('forwards the level setters', async () => {
		const speech = await createTauriSpeech();
		await speech.setRate(0.1);
		await speech.setPitch(0.2);
		await speech.setVolume(0.3);
		expect(state.calls).toEqual([['setRate', 0.1], ['setPitch', 0.2], ['setVolume', 0.3]]);
	});

	test('returns null and names the install command when the npm package is missing', async () => {
		vi.resetModules();
		vi.doMock('tauri-plugin-prism-api', () => {
			throw new Error('Cannot find package');
		});

		const { createTauriSpeech } = await import('../src/tauri/speech.js');
		expect(await createTauriSpeech()).toBe(null);
		expect(console.warn.mock.calls[0][0]).toContain('npm install tauri-plugin-prism-api');

		vi.doUnmock('tauri-plugin-prism-api');
		vi.resetModules();
	});
});
