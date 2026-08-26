// Exercises each signature from the PR review the way a consumer would.
import type { StorageInstance } from '../src/storage.js';

import {
	textField, passwordField, textAreaField, numberField, rangeField,
	percentRangeField, selectField, checkboxField, radioGroup, checkboxGroup,
	keyField, confirmButton, createFields, renderScreen, createMenu, MenuItem,
} from '../src/ui/index.js';

import {
	create_sound_pool, sound_pool, sound_pool_item,
} from '../src/audio/pool.js';

declare const root: HTMLElement;
declare const storage: StorageInstance;

// 1. Field builders take (label, options).
let volume = 0.5;
const f1: HTMLElement = textField('Name', { get: () => 'a', set: (v) => { v.length; } });
passwordField('Password', { get: () => '', set: () => {} });
textAreaField('Notes', { get: () => '', set: (v, display) => { v.length; display.length; } });
numberField('Lives', { get: () => 3, set: (v) => { v.toFixed(); } });
rangeField('Volume', { get: () => volume, set: (v) => { volume = v; }, min: 0, max: 1, step: 0.05 });
percentRangeField('Volume', { get: () => volume, set: (v) => { volume = v; } });
selectField('Difficulty', {
	get: () => 'easy',
	set: (v, label) => { v.toString(); label.length; },
	choices: [{ value: 'easy', label: 'Easy' }, { value: 'hard', label: 'Hard' }],
});
checkboxField('Music', { get: () => true, set: (v) => { const b: boolean = v; b; } });
radioGroup('Mode', { get: () => 1, set: () => {}, choices: [{ value: 1, label: 'One' }] });
checkboxGroup('Flags', { get: () => ['a'], set: (vals) => { vals.length; }, choices: [{ value: 'a', label: 'A' }] });
keyField('Jump', { get: () => ' ', set: (k) => { k.length; } });
confirmButton('Delete save', { confirmLabel: 'Really delete?', onConfirm: () => {} });

// A one-argument call must fail.
// @ts-expect-error label is required
textField({ get: () => '', set: () => {} });

// 2. createFields takes { storage, defaults, onChange } and returns bound builders.
const fields = createFields({
	storage,
	defaults: { volume: 0.8 },
	onChange: (change) => {
		const k: string = change.key;
		const m: string = change.message;
		const t: 'text' | 'password' | 'textArea' | 'number' | 'range' | 'percentRange'
			| 'select' | 'checkbox' | 'radioGroup' | 'checkboxGroup' | 'key' = change.type;
		k; m; t;
	},
});
const volumeNode: HTMLElement = fields.percentRange('volume', 'Volume');
fields.text('name', 'Name', { maxLength: 20 });
fields.select('difficulty', 'Difficulty', { choices: [{ value: 'easy', label: 'Easy' }] });
fields.key('jump', 'Jump');
volumeNode;

// @ts-expect-error storage is required
createFields({});
// @ts-expect-error the old (container, fields) form is gone
createFields(root, [volumeNode]);

// 3. renderScreen returns { dispose() }.
const screen = renderScreen(root, (r) => {
	r.textContent = '';
	return () => {};
});
screen.dispose();
// @ts-expect-error the handle is not callable
screen();

// 4/5/6/7. Sound pool.
const pool = create_sound_pool(64);
const pool2 = create_sound_pool(64, { engine: null });
const pool3 = new sound_pool(64);
pool2; pool3;

const slot: number = pool.play_1d('step.ogg', 0, 5, false);
const slot2: number = pool.play_2d('step.ogg', 0, 0, 5, 5, false);
const slot3: number = pool.play_2d('step.ogg', 0, 0, 5, 5, 90, false, true);
const slot4: number = pool.play_3d('step.ogg', 0, 0, 0, 5, 5, 5, 0, false);
const slot5: number = pool.play_3d('step.ogg', { x: 0, y: 0, z: 0 }, { x: 5, y: 5, z: 5 }, 0, false);
const slot6: number = pool.play_extended_1d('s.ogg', 0, 5, 0, 0, false, 0, 0, 0, 100);
const slot7: number = pool.play_extended_2d('s.ogg', 0, 0, 5, 5, 0, 0, 0, 0, false, 0, 0, 0, 100);
const slot8: number = pool.play_extended_3d('s.ogg', 0, 0, 0, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, false, 0, 0, 0, 100);
const slot9: number = pool.play_stationary('music.ogg', true, true);
slot2; slot3; slot4; slot5; slot6; slot7; slot8; slot9;

if (slot === -1) { /* pool full */ }
pool.update_listener_1d(0);
pool.update_listener_2d(0, 0, 90);
pool.update_listener_3d(0, 0, 0, 90);
pool.update_listener_3d({ x: 0, y: 0, z: 0 }, 90);
pool.update_sound_3d(slot, 1, 2, 3);
pool.update_sound_3d(slot, { x: 1, y: 2, z: 3 });
pool.set_sound_owner(slot, 'player', 1);
const found: number = pool.get_sound_by_owner('player', 1);
pool.destroy_sound(slot);
pool.destroy_sounds('player');
pool.destroy_all();
pool.max_distance = 100;
pool.y_is_elevation = true;
found;

const item: sound_pool_item = pool.items[0];
item.reset();
item.close();
item.spawn(true);
item.update(0, 0, 0, 0, 100);
const active: boolean = item.active;
const dist: number = item.get_total_distance(0, 0, 0);
active; dist;

// The old invented surface must be gone.
// @ts-expect-error updateListener was never a method
pool.updateListener(0, 0);
// @ts-expect-error the pool takes a size, not an audio instance
const bad = create_sound_pool({ engine: null });
bad;

// 8. MenuItem is a class with types.
declare const menu: ReturnType<typeof createMenu>;
const mi: MenuItem | null = menu.item('volume');
if (mi !== null) {
	const label: string = mi.label;
	const spoken: string = mi.speak();
	const changed: boolean = mi.toggle();
	const node: HTMLElement = mi.rebuild();
	const idx: number = mi.index;
	mi.focus();
	label; spoken; changed; node; idx;
}
const chosen: Promise<MenuItem | null> = menu.run();
chosen;
