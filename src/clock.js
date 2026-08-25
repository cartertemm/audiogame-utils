// Manages 60 FPS game loop timing, delta time, and countdown timers.

const FRAME_INTERVAL_TOLERANCE_MS = 0.01;

export function createClock({ fps = 60, onTick = null, autoStart = false } = {}) {
	let targetFps = Math.max(1, fps);
	let frameInterval = 1000 / targetFps;
	let running = false;
	let timerId = null;
	let lastTime = 0;
	let lastTickTime = 0;
	let accumulatedFrameTime = 0;
	let dt = 0;
	let elapsed = 0;
	let tickCount = 0;
	const listeners = new Set();

	if (typeof onTick === 'function') {
		listeners.add(onTick);
	}

	function step(manualDt = null) {
		const delta = manualDt !== null ? manualDt : (1 / targetFps);
		dt = delta;
		elapsed += delta;
		tickCount++;
		for (const fn of listeners) {
			fn(dt, elapsed);
		}
	}

	function loop() {
		if (!running) return;
		const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
		const deltaMs = lastTime > 0 ? now - lastTime : frameInterval;
		lastTime = now;

		if (typeof requestAnimationFrame !== 'undefined' && targetFps >= 50 && targetFps <= 65) {
			accumulatedFrameTime += deltaMs;
			if (accumulatedFrameTime + FRAME_INTERVAL_TOLERANCE_MS >= frameInterval) {
				step((now - lastTickTime) / 1000);
				lastTickTime = now;
				accumulatedFrameTime = accumulatedFrameTime >= frameInterval
					? accumulatedFrameTime % frameInterval
					: 0;
			}
			timerId = requestAnimationFrame(loop);
		} else {
			step(deltaMs / 1000);
			timerId = setTimeout(loop, frameInterval);
		}
	}

	function start() {
		if (running) return;
		running = true;
		lastTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
		lastTickTime = lastTime;
		accumulatedFrameTime = 0;
		if (typeof requestAnimationFrame !== 'undefined' && targetFps >= 50 && targetFps <= 65) {
			timerId = requestAnimationFrame(loop);
		} else {
			timerId = setTimeout(loop, frameInterval);
		}
	}

	function stop() {
		if (!running) return;
		running = false;
		if (timerId !== null) {
			if (typeof cancelAnimationFrame !== 'undefined') {
				cancelAnimationFrame(timerId);
			}
			clearTimeout(timerId);
			timerId = null;
		}
	}

	function reset() {
		stop();
		dt = 0;
		elapsed = 0;
		tickCount = 0;
		lastTime = 0;
		lastTickTime = 0;
		accumulatedFrameTime = 0;
	}

	if (autoStart) {
		start();
	}

	return {
		get running() {
			return running;
		},
		get fps() {
			return targetFps;
		},
		set fps(val) {
			targetFps = Math.max(1, val);
			frameInterval = 1000 / targetFps;
		},
		get dt() {
			return dt;
		},
		get elapsed() {
			return elapsed;
		},
		get tickCount() {
			return tickCount;
		},
		on(handler) {
			if (typeof handler === 'function') listeners.add(handler);
		},
		off(handler) {
			listeners.delete(handler);
		},
		start,
		stop,
		reset,
		tick(manualDt = null) {
			step(manualDt);
		},
	};
}

export function createTimer({ duration = 1, onTick = null, onComplete = null, autoStart = false } = {}) {
	let targetDuration = Math.max(0, duration);
	let remaining = targetDuration;
	let running = false;

	function update(dt) {
		if (!running || remaining <= 0) return;
		remaining = Math.max(0, remaining - dt);
		if (typeof onTick === 'function') {
			onTick(remaining, targetDuration);
		}
		if (remaining === 0) {
			running = false;
			if (typeof onComplete === 'function') {
				onComplete();
			}
		}
	}

	function start() {
		if (remaining <= 0) {
			remaining = targetDuration;
		}
		running = true;
	}

	function pause() {
		running = false;
	}

	function reset() {
		running = false;
		remaining = targetDuration;
	}

	if (autoStart) {
		start();
	}

	return {
		get running() {
			return running;
		},
		get duration() {
			return targetDuration;
		},
		get remaining() {
			return remaining;
		},
		get progress() {
			if (targetDuration === 0) return 1;
			return Math.min(1, Math.max(0, (targetDuration - remaining) / targetDuration));
		},
		start,
		pause,
		reset,
		update,
	};
}
