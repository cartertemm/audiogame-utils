import type { AudioInstance, SurfaceManager } from '../src/audio/index.js';
import type { sound_pool } from '../src/audio/pool.js';
import type { DescribedAction, GamepadInstance, InputHandlerInstance, KeyboardInstance, TouchInstance } from '../src/input/index.js';
import type { Clock, Timer } from '../src/clock.js';
import type { Stat, StatSet } from '../src/stats.js';
import type { EventEmitter } from '../src/events.js';
import type { StorageInstance } from '../src/storage.js';
import type { SpeechInstance } from '../src/speech/index.js';
import type { MapInstance } from '../src/map/index.js';
import type { FocusTrap } from '../src/focus.js';
import type { RTree, Vector3 } from '../src/physics/index.js';
import type { ReconnectingClient, WrappedSocket } from '../src/net/index.js';

import * as root from '../src/index.js';
import * as text from '../src/text.js';
import * as units from '../src/audio/units.js';
import * as coords from '../src/audio/coords.js';
import * as platform from '../src/platform.js';

const _createAudio: typeof root.createAudio = root.createAudio;
const _createSurfaceManager: typeof root.createSurfaceManager = root.createSurfaceManager;
const _createClock: typeof root.createClock = root.createClock;
const _createTimer: typeof root.createTimer = root.createTimer;
const _createStatSet: typeof root.createStatSet = root.createStatSet;
const _createGamepad: typeof root.createGamepad = root.createGamepad;
const _prettyNumber: typeof root.prettyNumber = root.prettyNumber;
const _rotation: typeof root.rotation = root.rotation;
const _math: typeof root.math = root.math;
const _physics: typeof root.physics = root.physics;
const _origin: Vector3 = root.physics.vector();
_createAudio; _createSurfaceManager; _createClock; _createTimer;
_createStatSet; _createGamepad; _prettyNumber; _rotation; _math; _physics; _origin;

const iosStandalone: boolean = platform.isIOSStandalone();
iosStandalone;

declare const clock: Clock;
const dt: number = clock.dt;
const ticks: number = clock.tickCount;
clock.fps = 30;
clock.on((delta, elapsed) => { delta + elapsed; });
clock.tick(1 / 60);
clock.tick();
dt; ticks;

declare const timer: Timer;
timer.update(clock.dt);
const progress: number = timer.progress;
progress;
// @ts-expect-error duration is read only
timer.duration = 5;

declare const stats: StatSet;
const stat: Stat | null = stats.get('score');
const names: string[] = stats.list('add_order', ['score'], ['deaths']);
const added: boolean = stats.deserialize(stats.serialize());
stat; names; added;

const spoken: string = text.prettySequence(['red', 'green', 'blue'], 'and');
const big: string = text.prettyNumber(1_500_000n);
const clock12: string = text.formatTime(125_000, false);
const one: string = text.pluralize(1, 'life', 'lives');
const near = text.closestMatch('atack', ['attack', 'defend'], 2);
if (near) {
	const match: string = near.match;
	const distance: number = near.distance;
	match; distance;
}
spoken; big; clock12; one;
// @ts-expect-error candidates must be iterable, not a single value
text.closestMatch('a', 3);

declare const audio: AudioInstance;
const sfx = audio.sfx('step.ogg', { panType: 'HRTF' });
sfx.rampPitch({ from: 1, to: 2, durationMs: 500 });
sfx.update({ volume: 0.5, pan: -1 });
const loaded = sfx.load();
loaded;
// @ts-expect-error panType only takes the two engine values
audio.sfx('step.ogg', { panType: 'binaural' });

declare const surfaces: SurfaceManager;
declare const pool: sound_pool;
surfaces.registerSurface('grass', ['grass1.ogg', 'grass2.ogg']);
surfaces.addSound('grass', 'grass3.ogg');
const heard: boolean = surfaces.hasSurface('grass');
surfaces.playStep('grass', 1, 2, 3, { listenerX: 0, rotation: 90, volume: 0.8 });
surfaces.clear();
heard; pool;

const gain: number = units.inverse_gain(10, 1, 1);
const rel = coords.listener_relative(1, 2, 3, 0, 0, 0, 90);
const forward: number = rel.forward;
gain; forward;

declare const keyboard: KeyboardInstance;
declare const touch: TouchInstance;
declare const gamepad: GamepadInstance;
declare const input: InputHandlerInstance;
keyboard.on('keypress', event => { event.key.toLowerCase(); });
touch.on('swipe', event => { const d: 'left' | 'right' | 'up' | 'down' = event.direction; d; });
gamepad.on('buttonpress', event => { const button: number = event.button; button; });
const rumbled: Promise<boolean> = gamepad.vibrate({ duration: 100 });
const down: boolean = gamepad.isDown('dpad_up');
rumbled; down;

input.bind('jump', { press: [' '], gamepad: ['a', 0], swipe: [{ direction: 'up', fingerCount: 1 }] });
if (input.wasTriggered('jump')) { /* jump */ }
input.on('jump', event => { const name: string = event.name; name; });
const described = input.describe('jump');
if (described) {
	const labels: string[] = described.bindings.map(root.formatBinding);
	labels;
}
const all: DescribedAction[] = input.describe();
all;
// @ts-expect-error hold takes key names, not gamepad indexes
input.bind('crouch', { hold: [4] });

declare const emitter: EventEmitter;
const unbind: () => void = emitter.on('score', (data?: number) => { data; });
emitter.once('score', () => {});
const listeners: number = emitter.listenerCount('score');
unbind(); listeners;

declare const storage: StorageInstance;
declare const speech: SpeechInstance;
declare const gameMap: MapInstance;
declare const trap: FocusTrap;
declare const tree: RTree;
declare const socket: WrappedSocket;
declare const client: ReconnectingClient;
storage; speech; gameMap; trap; tree; socket; client;
