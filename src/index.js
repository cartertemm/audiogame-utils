export { createStorage } from './storage.js';
export { isIOS, isIOSStandalone } from './platform.js';
export { EventEmitter } from './events.js';
export * as rotation from './rotation.js';

export { createKeyboard, createMouse, createTouch, createInputHandler, formatBinding } from './input/index.js';
export { createSpeech, MODE_ARIA, MODE_TTS, MODE_BOTH } from './speech/index.js';
export { createAudio, createSfx, createCacophonyEngine } from './audio/index.js';
export { wrapSocket, createReconnectingClient, createIdentity } from './net/index.js';
