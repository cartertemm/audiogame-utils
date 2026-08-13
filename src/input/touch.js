// Recognizes gestures that use one or more fingers.
//
// A gesture starts with the first touch and ends when the last touch ends. The
// handler classifies the gesture once by comparing the starting and ending
// centroids of all participating touches. `fingerCount` reports the highest
// number of simultaneous touches during the gesture.
//
// The handler waits for `multiTapWindow` before emitting a tap so it can combine
// consecutive taps. It emits immediately when the tap count reaches
// `maxTapCount`.
//
// Touch handlers call `preventDefault`, which prevents scrolling. Pass `target`
// to limit touch handling to a specific element.

const DEFAULTS = {
	target: null,
	tapMaxDistance: 10,
	tapMaxDuration: 300,
	swipeMinDistance: 30,
	swipeMaxDuration: 500,
	multiTapWindow: 250,
	multiTapMaxDistance: 40,
	maxTapCount: 3,
};

export function createTouch(userOptions = {}) {
	const options = { ...DEFAULTS, ...userOptions };
	const target = options.target ?? document.body;
	const fingers = new Map();
	const handlers = {
		touchstart: new Set(),
		touchmove: new Set(),
		touchend: new Set(),
		tap: new Set(),
		swipe: new Set(),
	};

	let attached = false;
	let gestureStartTime = 0;
	let gesturePeakFingerCount = 0;
	const gestureFingers = new Map();
	let pendingTap = null;

	function emit(name, payload) {
		for (const fn of handlers[name]) fn(payload);
	}

	function resetGesture() {
		gestureStartTime = 0;
		gesturePeakFingerCount = 0;
		gestureFingers.clear();
	}

	function record(touch) {
		const now = performance.now();
		if (fingers.size === 0) {
			gestureFingers.clear();
			gesturePeakFingerCount = 0;
			gestureStartTime = now;
		}
		fingers.set(touch.identifier, {
			x: touch.clientX,
			y: touch.clientY,
			startX: touch.clientX,
			startY: touch.clientY,
			startTime: now,
		});
		gestureFingers.set(touch.identifier, {
			id: touch.identifier,
			startX: touch.clientX,
			startY: touch.clientY,
			endX: touch.clientX,
			endY: touch.clientY,
			startTime: now,
		});
		if (fingers.size > gesturePeakFingerCount) {
			gesturePeakFingerCount = fingers.size;
		}
	}

	function update(touch) {
		const f = fingers.get(touch.identifier);
		if (!f) return;
		f.x = touch.clientX;
		f.y = touch.clientY;
		const gf = gestureFingers.get(touch.identifier);
		if (gf) {
			gf.endX = touch.clientX;
			gf.endY = touch.clientY;
		}
	}

	function release(touch) {
		const f = fingers.get(touch.identifier);
		if (!f) return;
		const gf = gestureFingers.get(touch.identifier);
		if (gf) {
			gf.endX = touch.clientX;
			gf.endY = touch.clientY;
		}
		fingers.delete(touch.identifier);
	}

	function emitPendingTap() {
		if (!pendingTap) return;
		const { fingerCount, x, y, tapCount } = pendingTap;
		pendingTap = null;
		emit('tap', { fingerCount, tapCount, x, y });
	}

	function flushPendingTap() {
		if (!pendingTap) return;
		clearTimeout(pendingTap.timer);
		emitPendingTap();
	}

	function handleTapGesture({ fingerCount, x, y }) {
		if (pendingTap
			&& pendingTap.fingerCount === fingerCount
			&& Math.hypot(x - pendingTap.x, y - pendingTap.y) < options.multiTapMaxDistance) {
			clearTimeout(pendingTap.timer);
			pendingTap.tapCount += 1;
			pendingTap.x = x;
			pendingTap.y = y;
			if (pendingTap.tapCount >= options.maxTapCount) {
				emitPendingTap();
				return;
			}
			pendingTap.timer = setTimeout(emitPendingTap, options.multiTapWindow);
			return;
		}
		if (pendingTap) {
			clearTimeout(pendingTap.timer);
			emitPendingTap();
		}
		pendingTap = {
			fingerCount,
			x,
			y,
			tapCount: 1,
			timer: setTimeout(emitPendingTap, options.multiTapWindow),
		};
	}

	function evaluateGesture() {
		if (gestureFingers.size === 0) return;
		const participants = Array.from(gestureFingers.values());
		let sumStartX = 0, sumStartY = 0, sumEndX = 0, sumEndY = 0;
		for (const p of participants) {
			sumStartX += p.startX;
			sumStartY += p.startY;
			sumEndX += p.endX;
			sumEndY += p.endY;
		}
		const n = participants.length;
		const startCentroid = { x: sumStartX / n, y: sumStartY / n };
		const endCentroid = { x: sumEndX / n, y: sumEndY / n };
		const dx = endCentroid.x - startCentroid.x;
		const dy = endCentroid.y - startCentroid.y;
		const distance = Math.hypot(dx, dy);
		const duration = performance.now() - gestureStartTime;

		if (distance > options.swipeMinDistance && duration < options.swipeMaxDuration) {
			const direction = Math.abs(dx) > Math.abs(dy)
				? (dx > 0 ? 'right' : 'left')
				: (dy > 0 ? 'down' : 'up');
			flushPendingTap();
			emit('swipe', {
				direction,
				fingerCount: gesturePeakFingerCount,
				distance,
				duration,
			});
			return;
		}

		if (distance < options.tapMaxDistance && duration < options.tapMaxDuration) {
			handleTapGesture({
				fingerCount: gesturePeakFingerCount,
				x: endCentroid.x,
				y: endCentroid.y,
			});
		}
	}

	function onStart(event) {
		event.preventDefault?.();
		for (const t of event.changedTouches) record(t);
		emit('touchstart', event);
	}

	function onMove(event) {
		event.preventDefault?.();
		for (const t of event.changedTouches) update(t);
		emit('touchmove', event);
	}

	function onEnd(event) {
		event.preventDefault?.();
		for (const t of event.changedTouches) release(t);
		emit('touchend', event);
		if (fingers.size === 0) {
			evaluateGesture();
			resetGesture();
		}
	}

	function attach() {
		if (attached) return;
		target.addEventListener('touchstart', onStart, { passive: false });
		target.addEventListener('touchmove', onMove, { passive: false });
		target.addEventListener('touchend', onEnd, { passive: false });
		target.addEventListener('touchcancel', onEnd, { passive: false });
		attached = true;
	}

	attach();

	return {
		get attached() {
			return attached;
		},

		fingerCount() {
			return fingers.size;
		},

		getFinger(index) {
			return this.getAllFingers()[index] ?? null;
		},

		getAllFingers() {
			return Array.from(fingers.entries()).map(([id, f]) => ({ id, x: f.x, y: f.y }));
		},

		on(name, handler) {
			handlers[name]?.add(handler);
		},

		off(name, handler) {
			handlers[name]?.delete(handler);
		},

		attach,

		dispose() {
			fingers.clear();
			resetGesture();
			if (pendingTap) {
				clearTimeout(pendingTap.timer);
				pendingTap = null;
			}
			for (const set of Object.values(handlers)) set.clear();
			if (!attached) return;
			target.removeEventListener('touchstart', onStart);
			target.removeEventListener('touchmove', onMove);
			target.removeEventListener('touchend', onEnd);
			target.removeEventListener('touchcancel', onEnd);
			attached = false;
		},
	};
}
