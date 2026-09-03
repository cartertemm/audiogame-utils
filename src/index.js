// @ts-self-types="./index.d.ts"
export { createStorage } from './storage.js';
export { isIOS, isIOSStandalone } from './platform.js';
export { EventEmitter } from './events.js';
export { createFocusTrap } from './focus.js';
export { el, mount, renderScreen, renderInstallPwaIos, renderSpeechSettings, speechSettingsFields, createMenu, MenuItem } from './ui/index.js';
export {
	createFields,
	textField, passwordField, textAreaField, numberField,
	rangeField, percentRangeField, selectField, checkboxField,
	radioGroup, checkboxGroup, keyField, keyName, confirmButton,
} from './ui/fields.js';
export * as rotation from './rotation.js';
export * as math from './math.js';
export * as physics from './physics/index.js';

export { createKeyboard, createMouse, createTouch, createGamepad, createInputHandler, formatBinding } from './input/index.js';
export { createSpeech, MODE_ARIA, MODE_TTS, MODE_BOTH } from './speech/index.js';
export { createAudio, createSfx, createCacophonyEngine, createSurfaceManager, createMixer, get_shared_mixer } from './audio/index.js';
export { wrapSocket, createReconnectingClient, createIdentity } from './net/index.js';
export { createMap } from './map/index.js';
export { createClock, createTimer } from './clock.js';
export { Stat, StatSet, createStatSet, STAT_SORT_MODE } from './stats.js';
export { closestMatch, formatTime, pluralize, prettyNumber, prettySequence, stringDistance } from './text.js';
