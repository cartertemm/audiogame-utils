// Checks that Deno picks up a declaration for every entry point in deno.json.
// Each module is imported by its runtime specifier, so this only passes when the
// `@ts-self-types` directive on the JavaScript file resolves.
import { createAudio, createSurfaceManager, createClock, createStatSet, createGamepad, prettyNumber } from '../src/index.js';
import { createInputHandler, createKeyboard, createTouch, formatBinding } from '../src/input/index.js';
import { createSpeech } from '../src/speech/index.js';
import { create_sound_pool } from '../src/audio/pool.js';
import { listener_relative } from '../src/audio/coords.js';
import { inverse_gain } from '../src/audio/units.js';
import { createIdentity, wrapSocket } from '../src/net/index.js';
import { createStorage } from '../src/storage.js';
import { isIOS } from '../src/platform.js';
import { EventEmitter } from '../src/events.js';
import { createMenu, textField } from '../src/ui/index.js';
import { createFocusTrap } from '../src/focus.js';
import { move } from '../src/rotation.js';
import { clamp } from '../src/math.js';
import { createMap } from '../src/map/index.js';
import { createRTree } from '../src/physics/index.js';
import { createTimer } from '../src/clock.js';
import { STAT_SORT_MODE } from '../src/stats.js';
import { formatTime } from '../src/text.js';

declare const root: HTMLElement;

const storage = createStorage('game');
const speech = createSpeech({ storage });
const audio = createAudio();
const surfaces = createSurfaceManager({ audio });
surfaces.registerSurface('grass', ['grass1.ogg']);
const step = surfaces.playStep('grass', 1, 0, 1, { rotation: 90 });

const clock = createClock({ fps: 60, onTick: (dt, elapsed) => { dt + elapsed; } });
const timer = createTimer({ duration: 5, onComplete: () => {} });
clock.on(dt => timer.update(dt));

const stats = createStatSet();
stats.add('score', 0);
const ordered: string[] = stats.list(STAT_SORT_MODE.ADD_ORDER);

const keyboard = createKeyboard();
const touch = createTouch({ multiTapWindow: 300 });
const gamepad = createGamepad({ deadzone: 0.2 });
const input = createInputHandler({ keyboard, touch, gamepad });
input.bind('fire', { press: ['x'], gamepad: ['a'], tap: [{ fingerCount: 2 }] });
const label: string = input.describe('fire')?.bindings.map(formatBinding).join(', ') ?? '';

const pool = create_sound_pool(32);
const slot: number = pool.play_2d('step.ogg', 0, 0, 3, 4, false);
const gain: number = inverse_gain(5);
const rel = listener_relative(1, 2, 3, 0, 0, 0, 45);

const emitter = new EventEmitter();
const unbind = emitter.on('hit', () => {});

const identity = createIdentity(storage);
const socket = wrapSocket(new WebSocket('wss://example.invalid'), { onMessage: () => {} });

const menu = createMenu({ root, speech });
const field: HTMLElement = textField('Name', { get: () => '', set: () => {} });
const trap = createFocusTrap(root);
const tree = createRTree(new Int32Array([0, 0, 10, 10]), 1);
const gameMap = createMap();

const spoken: string = formatTime(90_000);
const scaled: string = prettyNumber(1234567);
const stepped = move(0, 0, 0, 90);
const clamped: number = clamp(5, 0, 1);
const ios: boolean = isIOS();

step; ordered; label; slot; gain; rel; unbind; identity; socket; menu; field;
trap; tree; gameMap; speech; spoken; scaled; stepped; clamped; ios;
