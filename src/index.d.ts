/**
 * Browser building blocks for accessible audio games.
 *
 * See the {@link https://github.com/cartertemm/audiogame-utils#readme | package guide}.
 *
 * @module
 */
export { createStorage } from './storage.js';
export { isIOS, isIOSStandalone } from './platform.js';
export { EventEmitter } from './events.js';
export { createFocusTrap } from './focus.js';
export {
	el, mount, renderScreen, renderInstallPwaIos, renderSpeechSettings, createMenu, MenuItem,
	createFields, textField, passwordField, textAreaField, numberField,
	rangeField, percentRangeField, selectField, checkboxField,
	radioGroup, checkboxGroup, keyField, keyName, confirmButton,
} from './ui/index.js';
/** Direction, movement, distance, and spatial angle helpers. */
export * as rotation from './rotation.js';
/** Range, interpolation, angle, and randomization helpers. */
export * as math from './math.js';
/** Spatial indexing and physics helpers. */
export * as physics from './physics/index.js';

export { createKeyboard, createMouse, createTouch, createGamepad, createInputHandler, formatBinding } from './input/index.js';
export { createSpeech, MODE_ARIA, MODE_TTS, MODE_BOTH } from './speech/index.js';
export { createAudio, createSfx, createCacophonyEngine, createSurfaceManager } from './audio/index.js';
export { wrapSocket, createReconnectingClient, createIdentity } from './net/index.js';
export { createMap } from './map/index.js';
export { createClock, createTimer } from './clock.js';
export { Stat, StatSet, createStatSet, STAT_SORT_MODE } from './stats.js';
export { closestMatch, formatTime, pluralize, prettyNumber, prettySequence, stringDistance } from './text.js';
