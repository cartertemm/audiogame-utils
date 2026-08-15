// The truck yard walk again. But this time, the truck is parked in a parking lot, and there is a stage just north of it.
// The data is loaded from a map file (examples/maps/venue.json).
// The map provides the tiles, zones, and every looping sound.

import { createStorage } from '../src/storage.js';
import { createSpeech } from '../src/speech/index.js';
import { createKeyboard } from '../src/input/index.js';
import { createFocusTrap } from '../src/focus.js';
import { createMap } from '../src/map/index.js';
import { sound_pool } from '../src/audio/pool.js';
import { move, turnleft, turnright, dir_to_string, get_2d_distance, calculate_x_y_angle, calculate_x_y_string, north, east, south, west } from '../src/rotation.js';

const MAP_URL = './maps/venue.json';
const TURN_INCREMENT = 45;
const STEP_MS = 150;
const TURN_MS = 260;
const STEP_VOLUME = -1;
const SRC_VOLUME = 0;
const STEP_COUNT = 5;

// The truck has to carry across the whole lot, so it keeps the gentle pool
// default. The music belongs to the hall, so it rolls off much faster: from the
// far end of the lot the stage is barely there, and it swells as you walk up to
// it. Higher numbers fade quicker.
const SRC_SETTINGS = {
	'./sounds/truck.ogg': { label: 'the truck' },
	'./sounds/menu/music.ogg': { label: 'the stage', rolloff: 0.5 },
};

const storage = createStorage('audiogame-utils-examples');
const speech = createSpeech({ storage });
const keyboard = createKeyboard();
const map = createMap();
const pool = new sound_pool();
pool.volume_step = 0.2;

const startButton = document.getElementById('start');
const game = document.getElementById('game');

let loaded = null;
let sources = [];
let player_x = 0;
let player_y = 0;
let facing = north;
let zone = '';
let last_step_at = 0;
let last_turn_at = 0;
let running = false;
let trap = null;

function load() {
	if (!loaded) {
		loaded = map.loadMap({ url: MAP_URL }).catch(err => {
			loaded = null;
			throw err;
		});
	}
	return loaded;
}

function tile_at(x, y) {
	return map.getOneAt('tile', x, y, 0)?.file;
}

function zone_at(x, y) {
	return map.getOneAt('zone', x, y, 0)?.name ?? 'open ground';
}

function step_sound() {
	const tile = tile_at(player_x, player_y);
	return tile ? `./sounds/${tile}${1 + Math.floor(Math.random() * STEP_COUNT)}.ogg` : null;
}

function play_sources() {
	const header = map.header();
	const entries = map.getDataAt('src', 0, header.maxx, 0, header.maxy, 0, header.maxz);
	sources = entries.map(entry => {
		const x = (entry.minx + entry.maxx) / 2;
		const y = (entry.miny + entry.maxy) / 2;
		const side = (entry.maxx - entry.minx) / 2;
		const depth = (entry.maxy - entry.miny) / 2;
		const settings = SRC_SETTINGS[entry.file] ?? {};
		const slot = pool.play_extended_2d(entry.file, player_x, player_y, x, y, facing, side, side, depth, depth, entry.loop, 0, 0.0, SRC_VOLUME, 100.0, true);
		if (settings.rolloff !== undefined) pool.update_sound_positioning_values(slot, -1, settings.rolloff);
		return { x, y, label: settings.label ?? entry.file };
	});
}

function position_report() {
	const tile = tile_at(player_x, player_y);
	const surface = tile ? ` on ${tile}` : '';
	return `${zone_at(player_x, player_y)}. ${player_x+1}, ${player_y+1}, facing ${dir_to_string(facing, false)}${surface}.`;
}

function source_report() {
	return sources.map(source => {
		const distance = Math.round(get_2d_distance(player_x, player_y, source.x, source.y));
		if (distance === 0) return `You are standing at ${source.label}.`;
		const angle = calculate_x_y_angle(player_x, player_y, source.x, source.y, facing);
		return `${source.label} is ${distance} steps away, ${calculate_x_y_string(angle)}.`;
	}).join(' ');
}

function step_offset() {
	if (keyboard.isDown('arrowup')) return north;
	if (keyboard.isDown('arrowright')) return east;
	if (keyboard.isDown('arrowdown')) return south;
	if (keyboard.isDown('arrowleft')) return west;
	return null;
}

function walk(offset) {
	const header = map.header();
	const target = move(player_x, player_y, facing, offset);
	const x = Math.round(target.x);
	const y = Math.round(target.y);
	if (x < 0 || x > header.maxx || y < 0 || y > header.maxy) {
		// Player ran into a wall. {play ouch sound here}
		return;
	}
	if (x === player_x && y === player_y) return;
	player_x = x;
	player_y = y;
	const step = step_sound();
	if (step) pool.play_stationary_extended(step, false, 0, 0.0, STEP_VOLUME, 100.0);
	pool.update_listener_2d(player_x, player_y, facing);
	const here = zone_at(player_x, player_y);
	if (here !== zone) {
		zone = here;
		speech.speak(here, true);
	}
}

function turn(direction) {
	facing = direction < 0 ? turnleft(facing, TURN_INCREMENT) : turnright(facing, TURN_INCREMENT);
	pool.update_listener_2d(player_x, player_y, facing);
	speech.speak(dir_to_string(facing, false), true);
}

function frame(now) {
	if (!running) return;
	const offset = step_offset();
	if (offset !== null && now - last_step_at >= STEP_MS) {
		last_step_at = now;
		walk(offset);
	}
	if (now - last_turn_at >= TURN_MS) {
		if (keyboard.isDown('q')) {
			last_turn_at = now;
			turn(-1);
		} else if (keyboard.isDown('e')) {
			last_turn_at = now;
			turn(1);
		}
	}
	requestAnimationFrame(frame);
}

keyboard.on('keypress', event => {
	if (!running) return;
	if (event.key === ' ') {
		event.preventDefault();
		speech.speak(`${position_report()} ${source_report()}`, true);
		return;
	}
	if (event.key === 'Escape') stop();
});

async function start() {
	speech.primeTts();
	startButton.disabled = true;
	try {
		await load();
	} catch (err) {
		startButton.disabled = false;
		speech.speak(`The map would not load. ${err.message}`, true);
		return;
	}
	startButton.disabled = false;
	player_x = 0;
	player_y = 0;
	facing = north;
	zone = zone_at(player_x, player_y);
	running = true;
	trap = createFocusTrap(game, { label: map.header().name });
	pool.update_listener_2d(player_x, player_y, facing);
	play_sources();
	requestAnimationFrame(frame);
	speech.speak(`You are at the south corner of the ${zone}, facing north. ${source_report()} Use the arrows to walk, q and e to turn, space to check your position, and escape to stop.`, true);
	startButton.textContent = 'Restart';
}

function stop() {
	running = false;
	pool.destroy_all();
	sources = [];
	trap?.release();
	trap = null;
	speech.speak('Stopped.', true);
	startButton.focus();
}

startButton.addEventListener('click', () => {
	if (running) stop();
	start();
});
