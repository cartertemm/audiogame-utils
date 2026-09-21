// @ts-self-types="./index.d.ts"
// Import this directly to use the adapters without runtime detection. Most games
// await `initRuntime()` from `audiogame-utils/runtime` instead.

import { convertFileSrc } from '@tauri-apps/api/core';
import { register } from '../platform.js';
import { createTauriStorageBackend } from './storage.js';
import { createTauriWindow } from './window.js';
import { createTauriSpeech } from './speech.js';

export { createTauriStorageBackend } from './storage.js';
export { createTauriWindow } from './window.js';
export { createTauriSpeech } from './speech.js';

export async function setup({ storeFile, writeDelayMs } = {}) {
	const storage = await createTauriStorageBackend({ file: storeFile, writeDelayMs });
	const speech = await createTauriSpeech();

	register('storage', storage);
	register('window', createTauriWindow());
	register('file', path => convertFileSrc(path));
	if (speech) register('speech', speech);

	return { storage };
}
