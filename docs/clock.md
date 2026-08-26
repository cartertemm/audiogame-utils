# Clock

The `audiogame-utils/clock` module provides a 60 FPS game loop timer (`createClock`) and countdown timers (`createTimer`).

```js
import { createClock, createTimer } from 'audiogame-utils/clock'

const clock = createClock({
	fps: 60,
	onTick: (dt, elapsed) => {
		updateGame(dt)
	},
})

clock.start()
```

## `createClock(options)`

Creates a game loop clock configured to run at a target frame rate (default 60 FPS).

| Option | Default | Description |
| --- | ---: | --- |
| `fps` | `60` | Target frames per second. |
| `onTick` | `null` | Callback function `(dt, elapsed)` called on every frame tick. |
| `autoStart` | `false` | Automatically start the clock loop when created. |

### Instance Properties & Methods

| Property / Method | Description |
| --- | --- |
| `running` | Boolean indicating if the clock is running. |
| `fps` | Getter/setter for target FPS (defaults to 60). |
| `dt` | Delta time of the last frame in seconds. |
| `elapsed` | Total elapsed time in seconds. |
| `tickCount` | Total tick count since start or reset. |
| `start()` | Starts the game loop. |
| `stop()` | Stops the game loop. |
| `reset()` | Stops the loop and resets elapsed time and tick count to 0. |
| `tick(manualDt)` | Manually advances the clock by a single step (useful in tests or fixed loops). |
| `on(handler)` | Subscribes a tick handler function `(dt, elapsed)`. |
| `off(handler)` | Unsubscribes a tick handler function. |

## `createTimer(options)`

Creates a reusable countdown timer.

```js
const cooldown = createTimer({
	duration: 3,
	onComplete: () => console.log('Cooldown ready'),
	autoStart: true,
})

// In your game loop:
cooldown.update(dt)
```

| Option | Default | Description |
| --- | ---: | --- |
| `duration` | `1` | Total countdown duration in seconds. |
| `onTick` | `null` | Callback function `(remaining, duration)` called on every update. |
| `onComplete` | `null` | Callback function called when remaining time reaches 0. |
| `autoStart` | `false` | Automatically start the timer when created. |

### Instance Properties & Methods

| Property / Method | Description |
| --- | --- |
| `running` | Boolean indicating if the timer is currently active. |
| `duration` | Total timer duration in seconds. |
| `remaining` | Remaining time in seconds. |
| `progress` | Number between 0 and 1 indicating countdown completion. |
| `start()` | Starts or resumes the timer. |
| `pause()` | Pauses the timer countdown. |
| `reset()` | Resets remaining time back to full duration. |
| `update(dt)` | Advances the timer by `dt` seconds. |
