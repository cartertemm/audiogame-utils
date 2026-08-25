# Audio

The `audiogame-utils/audio` module provides lazily loaded sound effects through Cacophony. It exports `createAudio`, `createSfx`, and `createCacophonyEngine`.

Most applications should use `createAudio`. The other exports are lower level pieces used to construct or replace the engine integration.

## Creating sounds

```js
import { createAudio } from 'audiogame-utils/audio'

const audio = createAudio()
const sounds = {
	hit: audio.sfx(() => import('./sounds/hit.ogg?url')),
	loop: audio.sfx('/sounds/table.ogg'),
}
```

`createAudio()` delays engine construction until a sound is loaded. `sfx(source)` accepts:

1. A URL string.
2. A function that returns a URL string.
3. A function that returns a promise for a bundler module with a default URL export.

Declaring a sound does not fetch it. The first call to `play()`, `load()`, or `setPosition()` loads it. The resolved asset is reused by later calls.

If the environment has no `AudioContext` or `webkitAudioContext`, sound handles remain inert and their methods do not throw. This allows server rendering and test environments to import and construct audio objects.

## Audio instance methods

### `sfx(source)`

Creates a sound handle and registers it with the audio instance.

### `preload(list)`

Loads the handles in `list`. When `list` is omitted, it loads every handle created by the instance.

```js
await audio.preload()
```

### `dispose()`

Stops every registered sound and removes the handles from the audio instance.

## Sound handle methods

### `play(options)`

Loads and plays the sound. Supported options are `loop`, `volume`, `pan`, and `position`.

```js
await sounds.hit.play({ volume: 0.8, pan: -0.4 })
await sounds.loop.play({ loop: true, volume: 0.35 })
```

Looping playback is idempotent. Repeated `play({ loop: true })` calls do not create overlapping voices while the current loop is playing. When several play calls wait for the same load, only the latest call starts playback.

Playback failures are written to `console.warn`. A failed load can be retried by calling `play()` again.

### `load()`

Loads the asset without playing it. Repeated calls share the same load operation.

### `isLooping()`

Returns whether a looping playback is still active.

### `stop()`

Stops current playback. It also invalidates a pending play call, so a sound that finishes loading afterward does not begin playing.

### `update(options)`

Updates `pan` and `volume` on the current playback. Calling it before playback has started has no effect.

```js
sounds.loop.update({ pan: 0.4, volume: 0.2 })
```

### `rampPitch(options)`

Changes playback rate from `from` to `to` over `durationMs`. Playback rate changes pitch and speed together.

```js
sounds.loop.rampPitch({ from: 0.5, to: 1, durationMs: 1000 })
```

### `setPosition(position)`

Loads the asset if needed and assigns a three dimensional position through the engine.

```js
await sounds.loop.setPosition([1, 0, -2])
```

A position can also be supplied when playback starts:

```js
await sounds.hit.play({ position: [1, 0, -2] })
```

## Low level exports

`createCacophonyEngine()` creates the adapter used by the default audio instance. Its interface consists of `load`, `play`, `stop`, and `setPosition`.

`createSfx(getEngine, source, { panType })` creates an individual sound handle. `panType` defaults to `'stereo'`. Pass `'HRTF'` for a handle you intend to position in 3D, because `setPosition()` and the `position` play option have no effect on a stereo handle. `getEngine` must be an asynchronous function that resolves to a compatible engine or `null`. Applications that do not provide a custom engine should use `createAudio().sfx(source)` instead.

## Surface footstep manager

`createSurfaceManager({ audio, pool })` groups footstep sounds by surface name and plays a randomly selected sound at a position in the game world. Import it from the audio module:

```js
import { createAudio, createSurfaceManager } from 'audiogame-utils/audio'

const audio = createAudio()
const surfaces = createSurfaceManager({ audio })
```

Pass either an `audio` instance from `createAudio()` or a `pool` from `create_sound_pool()`. Creating a manager without either one throws an error. When both are supplied, playback uses the pool.

The `audio` backend accepts the same sources as `audio.sfx()`: URL strings, functions that return URL strings, and functions that resolve to bundler modules with a default URL export. The pool backend accepts URL strings only.

### `registerSurface(name, sources)`

Registers a sound bank under `name`. `sources` can be one source, an array of sources, or omitted to create an empty bank. Registering an existing name replaces its current sounds. The name must be a nonempty string.

```js
surfaces.registerSurface('wood', [
	'/sounds/wood1.ogg',
	'/sounds/wood2.ogg',
])

surfaces.registerSurface('gravel', '/sounds/gravel1.ogg')
```

The manager copies an array passed to this method, so later changes to the original array do not alter the sound bank.

Returns `undefined`.

### `addSound(surfaceName, source)`

Adds one source to a sound bank. If `surfaceName` has not been registered, this method creates it. The name must be a nonempty string.

```js
surfaces.addSound('wood', '/sounds/wood3.ogg')
```

Returns `undefined`.

### `getSounds(surfaceName)`

Returns a copy of the sources registered for `surfaceName`. It returns an empty array when the surface does not exist. Changing the returned array does not change the registered bank.

```js
const woodSounds = surfaces.getSounds('wood')
```

### `hasSurface(surfaceName)`

Returns `true` when a surface exists and contains at least one source. An empty registered bank returns `false`.

```js
if (surfaces.hasSurface('wood')) {
	// The wood bank is ready for playback.
}
```

### `playStep(surfaceName, x, y, z, options)`

Selects a random source from the surface and plays it at `(x, y, z)`. Coordinates default to `0`. By default, `x` is east or west, `y` is north or south, and `z` is elevation. See [Audio coordinates](../src/audio/coords.js) for the alternate coordinate convention controlled by `set_sound_pool_default_y_elevation()`.

```js
await surfaces.playStep('wood', 5, 10, 0, {
	listenerX: 4,
	listenerY: 8,
	listenerZ: 0,
	rotation: 90,
	volume: 0.8,
})
```

The listener options describe the player's position and facing direction:

| Option | Audio default | Meaning |
| --- | --- | --- |
| `listenerX` | `0` | Listener position on the x axis. |
| `listenerY` | `0` | Listener position on the y axis. |
| `listenerZ` | `0` | Listener position on the z axis. |
| `rotation` | `0` | Clockwise listener rotation in degrees, where `0` faces north. |

With the `audio` backend, these values are used to convert the step position into listener relative HRTF coordinates. Other options, such as `volume`, are passed to the sound handle's `play()` method. The manager creates and reuses one sound handle per source, while each call gets its own playback position. Overlapping steps from the same source therefore do not move one another.

With the pool backend, each omitted listener option uses the corresponding last known pool value, falling back to `0` when that value is `null` or `undefined`. The method passes the selected source and coordinates to `pool.play_3d()`:

```js
import { create_sound_pool, createSurfaceManager } from 'audiogame-utils/audio'

const pool = create_sound_pool()
pool.update_listener_3d(4, 8, 0, 90)

const surfaces = createSurfaceManager({ pool })
surfaces.registerSurface('wood', '/sounds/wood1.ogg')

const slot = surfaces.playStep('wood', 5, 10, 0)
```

`playStep()` returns `null` without playing anything when the surface is missing or empty. With the `audio` backend, it otherwise returns the promise from the sound handle's `play()` method. With the pool backend, it returns the result of `pool.play_3d()`: a nonnegative reserved slot, `-1` when no slot is available, or `-2` when the step is outside the pool's maximum distance.

### `clear()`

Removes every registered surface and clears the manager's cached sound handles. With the `audio` backend, it calls `stop()` on every cached handle, stopping current playback and preventing pending playback from starting. It does not dispose the audio instance. With the pool backend, it does not stop allocated slots or call `pool.clear()`.

```js
surfaces.clear()
surfaces.hasSurface('wood') // false
```

Returns `undefined`.
