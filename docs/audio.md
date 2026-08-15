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

`createSfx(getEngine, source)` creates an individual sound handle. `getEngine` must be an asynchronous function that resolves to a compatible engine or `null`. Applications that do not provide a custom engine should use `createAudio().sfx(source)` instead.
