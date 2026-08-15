// A walk around a parked truck, built on the sound pool.
//
// The room is 20 by 20 and the truck idles in the center with a range box around
// it. You move relative to your own facing, so turning in place re-pans every
// sound in the room.

import { createStorage } from '../src/storage.js';
import { createSpeech } from '../src/speech/index.js';
import { createKeyboard } from '../src/input/index.js';
import { createFocusTrap } from '../src/focus.js';
import { sound_pool } from '../src/audio/pool.js';
import { move, turnleft, turnright, dir_to_string, get_2d_distance, calculate_x_y_angle, calculate_x_y_string, north, east, south, west } from '../src/rotation.js';

const ROOM_WIDTH = 20;
const ROOM_DEPTH = 20;
const TRUCK_X = Math.floor(ROOM_WIDTH / 2);
const TRUCK_Y = Math.floor(ROOM_DEPTH / 2);
const TRUCK_SIDE_RANGE = 0;
const TRUCK_DEPTH_RANGE = 1;
const TURN_INCREMENT = 45;
const STEP_MS = 150;
const TURN_MS = 260;
const STEP_VOLUME = -1;
const TRUCK_VOLUME = 0;
const STEP_COUNT = 5;

const storage = createStorage('audiogame-utils-examples');
const speech = createSpeech({ storage });
const keyboard = createKeyboard();
const pool = new sound_pool();

// One unit is one step, so sound has to carry across the whole room. The default
// rolloff of 1 would leave the truck almost silent from the far wall.
pool.volume_step = 0.2;

const startButton = document.getElementById('start');
const game = document.getElementById('game');

let player_x = 0;
let player_y = 0;
let facing = north;
let last_step_at = 0;
let last_turn_at = 0;
let running = false;
let trap = null;

function truck_report() {
	const distance = Math.round(get_2d_distance(player_x, player_y, TRUCK_X, TRUCK_Y));
	if (distance === 0) return 'You are standing at the truck.';
	const angle = calculate_x_y_angle(player_x, player_y, TRUCK_X, TRUCK_Y, facing);
	return `The truck is ${distance} steps away, ${calculate_x_y_string(angle)}.`;
}

function step_sound() {
	return `./sounds/concrete${1 + Math.floor(Math.random() * STEP_COUNT)}.ogg`;
}

// Arrows move relative to facing, so the offset is how far to rotate the step
// away from where you are pointed.
function step_offset() {
	if (keyboard.isDown('arrowup')) return north;
	if (keyboard.isDown('arrowright')) return east;
	if (keyboard.isDown('arrowdown')) return south;
	if (keyboard.isDown('arrowleft')) return west;
	return null;
}

function walk(offset) {
	const target = move(player_x, player_y, facing, offset);
	const x = Math.round(target.x);
	const y = Math.round(target.y);
	if (x < 0 || x >= ROOM_WIDTH || y < 0 || y >= ROOM_DEPTH) {
		// Player ran into a wall. {play ouch sound here}
		return;
	}
	if (x === player_x && y === player_y) return;
	player_x = x;
	player_y = y;
	pool.play_stationary_extended(step_sound(), false, 0, 0.0, STEP_VOLUME, 100.0);
	pool.update_listener_2d(player_x, player_y, facing);
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
		speech.speak(`${player_x+1}, ${player_y+1}, facing ${dir_to_string(facing, false)}. ${truck_report()}`, true);
		return;
	}
	if (event.key === 'Escape') stop();
});

function start() {
	speech.primeTts();
	player_x = 0;
	player_y = 0;
	facing = north;
	running = true;
	trap = createFocusTrap(game, { label: 'Truck yard' });
	pool.update_listener_2d(player_x, player_y, facing);
	pool.play_extended_2d('./sounds/truck.ogg', player_x, player_y, TRUCK_X, TRUCK_Y, facing, TRUCK_SIDE_RANGE, TRUCK_SIDE_RANGE, TRUCK_DEPTH_RANGE, TRUCK_DEPTH_RANGE, true, 0, 0.0, TRUCK_VOLUME, 100.0, true);
	requestAnimationFrame(frame);
	speech.speak(`You are in the southwest corner facing north. ${truck_report()} Use the arrows to walk, q and e to turn, space to check your position, and escape to stop.`, true);
	startButton.textContent = 'Restart';
}

function stop() {
	running = false;
	pool.destroy_all();
	trap?.release();
	trap = null;
	speech.speak('Stopped.', true);
	startButton.focus();
}

startButton.addEventListener('click', () => {
	if (running) stop();
	start();
});
