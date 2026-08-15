# Input

The `audiogame-utils/input` module provides keyboard, mouse, touch gesture, and named action input. It exports `createKeyboard`, `createMouse`, `createTouch`, `createInputHandler`, and `formatBinding`.

## Keyboard

```js
import { createKeyboard } from 'audiogame-utils/input'

const keyboard = createKeyboard()
keyboard.on('keypress', event => handleKey(event.key))

if (keyboard.isDown('arrowleft')) {
	moveLeft()
}
```

`createKeyboard({ target })` listens on `window` unless `target` is provided. It attaches immediately and exposes:

| Member | Description |
| --- | --- |
| `attached` | Whether listeners are attached. |
| `isDown(key)` | Returns whether the lowercased key is pressed. |
| `on(name, handler)` | Subscribes to `keydown`, `keyup`, or `keypress`. |
| `off(name, handler)` | Removes a subscription. |
| `attach()` | Restores listeners after disposal. Repeated calls have no effect. |
| `dispose()` | Clears state and handlers, then removes listeners. |

`keypress` reports the initial keydown only. Operating system repeat events still reach `keydown` but not `keypress`.

## Mouse

```js
import { createMouse } from 'audiogame-utils/input'

const mouse = createMouse()
const { x, y } = mouse.getPosition()

if (mouse.isButtonDown()) {
	aimAt(x, y)
}
```

`createMouse({ target })` listens on `window` unless `target` is provided. It tracks the primary button and client coordinates. Its `on` and `off` methods support `mousedown`, `mouseup`, and `mousemove`.

The instance also provides `attached`, `attach()`, and `dispose()` with the same lifecycle behavior as a keyboard instance. `getPosition()` returns a new `{ x, y }` object.

## Touch gestures

```js
import { createTouch } from 'audiogame-utils/input'

const touch = createTouch({ maxTapCount: 3 })
touch.on('swipe', event => handleSwipe(event.direction, event.fingerCount))
touch.on('tap', event => handleTap(event.tapCount, event.fingerCount))
```

`createTouch(options)` listens on `document.body` unless `target` is provided. Touch handlers call `preventDefault`, which prevents scrolling on the target.

| Option | Default | Description |
| --- | ---: | --- |
| `target` | `document.body` | Element that receives touch listeners. |
| `tapMaxDistance` | `10` | Maximum centroid movement for a tap, in pixels. |
| `tapMaxDuration` | `300` | Maximum tap duration, in milliseconds. |
| `swipeMinDistance` | `30` | Minimum centroid movement for a swipe, in pixels. |
| `swipeMaxDuration` | `500` | Maximum swipe duration, in milliseconds. |
| `multiTapWindow` | `250` | Time allowed between consecutive taps, in milliseconds. |
| `multiTapMaxDistance` | `40` | Maximum distance between consecutive taps, in pixels. |
| `maxTapCount` | `3` | Tap count that emits immediately instead of waiting for another tap. |

A gesture starts with the first touch and ends when the last touch ends. Classification uses the starting and ending centroids of every participating touch. `fingerCount` is the highest number of simultaneous touches in the gesture.

Tap events contain `fingerCount`, `tapCount`, `x`, and `y`. Swipe events contain `direction`, `fingerCount`, `distance`, and `duration`. Raw `touchstart`, `touchmove`, and `touchend` events are also available through `on` and `off`.

The instance provides `fingerCount()`, `getFinger(index)`, and `getAllFingers()` for current touches. It also provides `attached`, `attach()`, and `dispose()`.

## Named actions

`createInputHandler` maps game actions to keys and gestures so game code does not depend on a particular control scheme.

```js
import {
	createInputHandler,
	createKeyboard,
	createTouch,
	formatBinding,
} from 'audiogame-utils/input'

const keyboard = createKeyboard()
const touch = createTouch()
const input = createInputHandler({ keyboard, touch })

input.bind('moveLeft', { hold: ['arrowleft', 'a'] })
input.bind('pause', {
	press: ['p'],
	tap: [{ fingerCount: 2, tapCount: 1 }],
})
input.bind('menu', {
	swipe: [{ direction: 'up', fingerCount: 3 }],
})
```

`createInputHandler({ keyboard, touch, attach })` accepts keyboard and touch instances. It attaches to them by default. Pass `attach: false` to delay attachment.

A binding can contain these arrays:

| Property | Meaning |
| --- | --- |
| `hold` | Keys that remain active while pressed. |
| `press` | Keys that trigger once per physical press. |
| `tap` | Property sets matched against tap events. |
| `swipe` | Property sets matched against swipe events. |

Gesture specifications match only the properties they contain. An empty object matches any event of that kind. A specification such as `{ direction: 'left' }` matches a left swipe with any finger count.

Use `wasTriggered(name)` to poll an action. Discrete key, tap, and swipe triggers are consumed when read. Hold bindings return `true` for every poll while a matching key remains down. Use `on(name, handler)` and `off(name, handler)` for callbacks. Hold bindings do not generate callbacks.

```js
if (input.wasTriggered('moveLeft')) {
	moveLeft()
}

input.on('pause', () => openPauseMenu())
```

`bind(name, binding)` replaces an existing binding with the same name. `unbind(name)` removes the binding, its callbacks, and any pending trigger. `attach()`, `detach()`, and `dispose()` control subscriptions and cleanup.

## Describing controls

`describe(name)` returns one action description or `null`. Calling `describe()` without a name returns every action. Each result contains the action `name` and a flat `bindings` array.

Pass entries from that array to `formatBinding(binding)` to generate readable control labels:

```js
for (const action of input.describe()) {
	const controls = action.bindings.map(formatBinding).join(', ')
	console.log(`${action.name}: ${controls}`)
}
```

The formatter handles key names, holds, presses, tap counts, finger counts, and swipe directions. It returns an empty string for an unknown binding kind.
