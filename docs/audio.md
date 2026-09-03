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

## Grouping sounds

Sounds can be placed into named volume groups such as `music`, `effects`, or `voices`. This lets a settings screen give the player a separate volume control for each kind of sound while keeping the volume chosen for individual playback.

Pass the group name as the playback destination, then change its volume through `audio.mixer`:

```js
const music = audio.sfx('/sounds/music.ogg')
const step = audio.sfx('/sounds/step.ogg')

audio.mixer.channel('music').volume = settings.musicVolume
audio.mixer.channel('effects').volume = settings.effectsVolume
audio.mixer.channel('master').volume = settings.masterVolume

await music.play({ loop: true, destination: 'music' })
await step.play({ destination: 'effects' })
```

Group names are created when they are first used. Every group feeds the `master` channel, so changing `master` affects every sound assigned to a group. Assign every sound to a group if the master setting should control the entire game. Volumes can be set before any sound loads and are applied when the audio engine starts.

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

Loads and plays the sound. Supported options include `loop`, `volume`, `pan`, `position`, and `destination`. A string destination routes the sound through the mixer channel with that name.

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

## Mixer API

Each audio instance exposes its mixer as `audio.mixer`. The default audio engine uses one shared mixer, so separate `createAudio()` instances control the same channels.

### `channel(name)`

Returns the channel with the given name, creating it at full volume when needed. Repeated calls with the same name return the same channel object.

A channel has these properties:

| Property | Meaning |
| --- | --- |
| `name` | Read only channel name. |
| `volume` | Linear volume, normally from `0` through `1`. Values above `1` amplify the channel. |
| `db` | Volume in decibels, where `0` is full volume and `-100` is silence. |
| `node` | The channel's gain node, or `null` before the audio engine starts. |

Changing `volume` updates `db`, and changing `db` updates `volume`.

### `names()`

Returns the names of every channel created so far. The result always includes `master`.

### `node(name)`

Returns the gain node for a channel, creating the channel if needed. It returns `null` before the audio engine starts. Most applications should pass a channel name as `destination` instead of working with its node directly.

### Routing sound pools

Sound pools can route every sound they create through a group. Set the pool's `mixer` property to a channel name:

```js
import { create_sound_pool } from 'audiogame-utils/audio'

const pool = create_sound_pool()
pool.mixer = 'effects'
```

The `mix` argument on the extended playback methods can override that group for one sound. See [Sound pools](#sound-pools) for the complete pool API.

## Low level exports

`createMixer()` creates an independent mixer. Pass it to `createCacophonyEngine({ mixer })`, then pass that engine to `createAudio({ engine })`. `get_shared_mixer()` returns the mixer used by default audio engines. `MASTER_CHANNEL` contains the name `master`.

`mixer.attach(context, destination)` builds the gain nodes and connects them to an audio graph. The Cacophony engine calls it when its audio context becomes available, so applications normally do not need to call it.

`createCacophonyEngine({ mixer })` creates the adapter used by the default audio instance. When no mixer is supplied, it uses the shared mixer.

`createSfx(getEngine, source, { panType })` creates an individual sound handle. `panType` defaults to `'stereo'`. Pass `'HRTF'` for a handle you intend to position in 3D, because `setPosition()` and the `position` play option have no effect on a stereo handle. `getEngine` must be an asynchronous function that resolves to a compatible engine or `null`. Applications that do not provide a custom engine should use `createAudio().sfx(source)` instead.

## Sound pools

Anyone familiar with the BGT or NVGT scripting languages will recognize the sound pool. This implementation keeps the original class name, method names, units, and general workflow so existing knowledge and code translate readily to JavaScript.

For everyone else, a sound pool manages a fixed number of reusable sound slots. It can place sounds in one, two, or three dimensions, update them when the listener moves, pause or stop them by slot number, and recycle finished sounds. It is useful for a changing game world where creating a separate named handle for every possible sound would be awkward.

Use `createAudio()` for a known collection of interface sounds or effects. Use a sound pool when gameplay needs to create, move, find, and remove sounds dynamically.

### Basic use

```js
import { create_sound_pool } from 'audiogame-utils/audio'

const pool = create_sound_pool(32)
pool.max_distance = 30

const fountain = pool.play_2d(
	'/sounds/fountain.ogg',
	0, 0,       // Listener x and y
	8, 4,       // Sound x and y
	0,          // Listener rotation
	true,       // Looping
)

pool.update_listener_2d(2, 1, 90)
pool.destroy_sound(fountain)
```

The play methods return immediately while the browser loads audio in the background. They return a nonnegative slot number when the sound was reserved, `-1` when the pool has no available slot, or `-2` when a nonlooping two or three dimensional sound is beyond `max_distance` and does not need a slot.

Each slot corresponds to a `sound_pool_item`. The item holds the playback, position, ranges, owner, and other state for that slot. Items are managed internally, so applications normally work with slot numbers instead. Finished ordinary sounds can be recycled. Looping and persistent sounds keep their slots until they are explicitly destroyed. Paused sounds keep their slots until they are resumed, after which an ordinary sound can finish and be recycled.

The `items`, `highest_slot`, `clean_frequency`, and `engine` properties expose internal state used to manage the pool. Pass a custom engine through the constructor instead of changing these properties directly.

When `max_distance` is greater than zero, a two or three dimensional loop created outside that distance keeps its slot without starting playback. Listener and sound updates also suspend any loop that moves out of range. The pool starts it again when an update brings it back into range.

### Coordinates and units

The default coordinate system follows BGT and NVGT conventions. X runs east and west, Y runs north and south, and Z represents elevation. Rotation is clockwise in degrees, with `0` facing north and `90` facing east.

Call `set_sound_pool_default_y_elevation(true)` before creating a pool if the game uses X for width, Y for elevation, and Z for depth.

Pool playback uses these units:

| Value | Unit |
| --- | --- |
| `offset` | Seconds from the start of the file. |
| `start_pan` | Stereo pan from `-100` on the left through `100` on the right. |
| `start_volume` and `amp` | Decibels, where `0` is full volume and `-100` is silence. |
| `start_pitch` | Percentage, where `100` is normal speed and pitch. |
| Listener `rotation` | Clockwise degrees, where `0` faces north. |
| Range values | Distance along the corresponding axis before attenuation begins. |
| `mix` | A mixer channel name or audio graph node. |

The left and right ranges apply to X, backward and forward apply to Y, and lower and upper apply to Z. These names follow the default coordinate convention. When Y is elevation, the backward and forward values apply to elevation while lower and upper apply to depth. While the listener is inside the resulting range, the sound remains centered and plays at its starting volume and pitch. Outside it, positioning and attenuation begin at the nearest edge.

Source rotation and pivot arguments are retained for compatibility and currently have no audible effect. Do not depend on their internal representation.

## Sound pool API

### Creating a pool

```text
create_sound_pool(default_item_size = 100, options = {})
new sound_pool(default_item_size = 100, options = {})
```

Both forms create the same kind of pool. `default_item_size` fixes the number of slots. The pool does not grow when all slots are occupied. Pass `{ engine }` to use a custom audio engine. Otherwise, audio is loaded through the shared engine when the first sound needs it.

The factory and class are both exported from `audiogame-utils/audio` and `audiogame-utils/audio/pool`.

### Coordinate convention

#### `sound_pool_default_y_elevation`

The coordinate convention copied by new pools. It starts as `false`.

#### `set_sound_pool_default_y_elevation(value)`

Sets the convention copied by new pools. Listener updates can also refresh an existing pool from this value, as described under `update_listener_3d()`.

Returns `undefined`.

### Pool settings

Change these properties before playing a sound when they should become its defaults:

| Property | Default | Meaning |
| --- | --- | --- |
| `y_is_elevation` | Current global setting | Whether Y is elevation and Z is depth. When false, Z is elevation and Y is depth. |
| `max_distance` | `0` | Pool culling distance. It skips distant two and three dimensional one shots, holds distant two and three dimensional loops, and suspends loops that move out of range during updates. Zero disables pool culling. |
| `pan_step` | `1` | Stereo positioning strength copied by new sounds. |
| `volume_step` | `1` | Distance rolloff copied by new sounds. Higher values fade more quickly. |
| `behind_pitch_decrease` | `0.25` | Pitch percentage points removed when a sound is behind the listener. The same reduction is applied when it is below the listener. |
| `hrtf` | `true` | Whether new positioned sounds use HRTF. When false, they use stereo panning. Stationary sounds always use stereo panning. |
| `occlude` | `true` | Compatibility setting copied to new items. The current engine integration does not apply occlusion. |
| `mixer` | `null` | Default mixer channel name or audio graph node for new sounds. |

The pool also stores its latest listener state in `last_listener_x`, `last_listener_y`, `last_listener_z`, and `last_listener_rotation`. Each starts at `0` and is updated by the listener methods and positioned play methods.

Settings such as `pan_step`, `volume_step`, `behind_pitch_decrease`, `hrtf`, `occlude`, and `mixer` are copied into a slot when a sound is reserved. Changing the pool setting does not rewrite existing slots. `update_sound_positioning_values()` can replace the pan and volume positioning values for an existing sound. The other settings apply to sounds reserved afterward.

### Playing sounds

Every play method accepts a URL string as `filename` and returns a slot number using the rules described above. The basic methods use an offset of `0`, centered pan, `0` dB volume, `100` percent pitch, and no free ranges.

#### `play_stationary(filename, looping, persistent = false)`

Plays a sound without positioning it in the game world. A stationary sound does not change when the listener moves.

#### `play_stationary_extended(filename, looping, offset, start_pan, start_volume, start_pitch, persistent = false, mix = null)`

Plays a stationary sound with explicit playback values. `mix` overrides the pool's `mixer` for this sound when supplied.

#### `play_1d(filename, listener_x, sound_x, looping, persistent = false)`

Plays a sound positioned on the X axis.

#### `play_extended_1d(filename, listener_x, sound_x, left_range, right_range, looping, offset, start_pan, start_volume, start_pitch, persistent = false, mix = null)`

Plays a sound on the X axis with free ranges and explicit playback values.

#### `play_2d(filename, listener_x, listener_y, sound_x, sound_y, looping, persistent = false)`

Plays a sound on the X and Y axes with a listener rotation of `0`. Under the default coordinate convention, this is the horizontal plane.

#### `play_2d(filename, listener_x, listener_y, sound_x, sound_y, rotation, looping, persistent = false)`

Plays a sound on the X and Y axes with an explicit listener rotation. Under the default coordinate convention, this is the horizontal plane.

#### `play_extended_2d(...)`

The two dimensional extended method has forms with and without listener rotation:

```text
pool.play_extended_2d(
	filename,
	listener_x, listener_y,
	sound_x, sound_y,
	left_range, right_range, backward_range, forward_range,
	looping, offset, start_pan, start_volume, start_pitch,
	persistent = false, mix = null,
)

pool.play_extended_2d(
	filename,
	listener_x, listener_y,
	sound_x, sound_y,
	rotation,
	left_range, right_range, backward_range, forward_range,
	looping, offset, start_pan, start_volume, start_pitch,
	persistent = false, mix = null,
)
```

Both forms play a sound on the X and Y axes with explicit free ranges and playback values. Under the default coordinate convention, this is the horizontal plane. The first form uses a rotation of `0`.

#### `play_3d(...)`

The three dimensional method accepts individual coordinates or coordinate objects:

```text
pool.play_3d(
	filename,
	listener_x, listener_y, listener_z,
	sound_x, sound_y, sound_z,
	rotation, looping, persistent = false,
)

pool.play_3d(
	filename,
	listener,
	sound_coordinate,
	rotation, looping, persistent = false,
)
```

The object form expects `{ x, y, z }` for both `listener` and `sound_coordinate`.

#### `play_extended_3d(...)`

```text
pool.play_extended_3d(
	filename,
	listener_x, listener_y, listener_z,
	sound_x, sound_y, sound_z,
	rotation,
	left_range, right_range,
	backward_range, forward_range,
	lower_range, upper_range,
	looping, offset, start_pan, start_volume, start_pitch,
	persistent = false,
	mix = null,
	start_playing = true,
	theta = 0,
)
```

Plays a three dimensional sound with every positioning and playback value exposed. Set `start_playing` to `false` to load and prepare the sound in a paused state. `theta` carries the source facing value used by the NVGT compatible interface.

#### `play_extended(...)`

```text
pool.play_extended(
	dimension,
	filename,
	listener_x, listener_y, listener_z,
	sound_x, sound_y, sound_z,
	rotation,
	left_range, right_range,
	backward_range, forward_range,
	lower_range, upper_range,
	looping, offset, start_pan, start_volume, start_pitch,
	persistent = false,
	mix = null,
	start_playing = true,
	theta = 0,
)
```

This is the common method behind the other play helpers. `dimension` is `0` for stationary playback, `1` for the X axis, `2` for the X and Y axes, or `3` for three dimensions. Under the default coordinate convention, dimension `2` is the horizontal plane. Prefer the specific helper unless the dimension is selected dynamically.

For all extended methods, `persistent` keeps a finished sound from being recycled. `mix` overrides the pool's default mixer destination. Free ranges and position settings are copied into the reserved slot.

### Checking and controlling playback

#### `sound_is_active(slot)`

Reports active playback semantics. A looping sound remains active while it is out of range and has no playback node. A nonlooping sound is active only while it is loading or playing. A `false` result does not necessarily mean that a persistent or paused slot is available for reuse.

#### `sound_is_playing(slot)`

Returns whether the slot currently has playing or loading audio. Returns `false` for an invalid or finished slot, and for a looping slot suspended outside `max_distance`. A sound paused while it is still loading can continue to report `true` until loading finishes.

#### `pause_sound(slot)`

Pauses a sound and keeps its slot reserved. Returns `true` when the sound was paused. Returns `false` for an inactive slot or a sound that is already paused.

#### `resume_sound(slot)`

Resumes a paused sound. If it is outside `max_distance`, it remains reserved without active playback. Returns `false` when the slot does not exist or the sound is not paused.

#### `pause_all()` and `resume_all()`

Pause or resume every applicable sound in the pool. Both return `undefined`.

#### `destroy_sound(slot)`

Stops one sound, clears its state, and frees its slot. Returns `true` when the slot existed, or `false` otherwise.

#### `destroy_all()`

Stops every sound and frees every slot. Returns `undefined`.

### Updating the listener

Listener updates store the new position and immediately refresh active positioned sounds.

#### `update_listener_1d(listener_x)`

Updates the listener on the X axis.

Returns `undefined`.

#### `update_listener_2d(listener_x, listener_y, rotation = 0)`

Updates the listener on the X and Y axes. Under the default coordinate convention, this is the horizontal plane.

Returns `undefined`.

#### `update_listener_3d(...)`

```text
pool.update_listener_3d(
	listener_x, listener_y, listener_z,
	rotation = 0,
	refresh_y_is_elevation = true,
)

pool.update_listener_3d(
	listener,
	rotation = 0,
	refresh_y_is_elevation = true,
)
```

The object form accepts `{ x, y, z }`. When `refresh_y_is_elevation` is `true`, the pool and its active items copy the current value of `sound_pool_default_y_elevation`. Pass `false` to preserve a convention assigned directly to this pool.

Both forms return `undefined`.

### Moving individual sounds

These methods return `true` when the slot exists and was updated, or `false` for an invalid slot.

#### `update_sound_1d(slot, x)`

Moves a sound on the X axis.

#### `update_sound_2d(slot, x, y)`

Moves a sound on the X and Y axes. Under the default coordinate convention, this is the horizontal plane.

#### `update_sound_3d(slot, x, y, z)` and `update_sound_3d(slot, coordinate)`

Moves a sound in three dimensions. The object form accepts `{ x, y, z }`.

#### `update_sound_start_values(slot, start_pan, start_volume, start_pitch)`

Replaces a sound's base pan, volume, and pitch, then applies them to current playback.

#### `update_sound_range_1d(slot, left_range, right_range)`

Replaces the free range on the X axis and refreshes the sound.

#### `update_sound_range_2d(slot, left_range, right_range, backward_range, forward_range)`

Replaces the free ranges on the X and Y axes and refreshes the sound. Under the default coordinate convention, these are the horizontal ranges.

#### `update_sound_range_3d(slot, left_range, right_range, backward_range, forward_range, lower_range, upper_range, update_sound = true)`

Replaces every free range. Set `update_sound` to `false` to store the ranges without immediately refreshing playback.

#### `update_sound_positioning_values(slot, pan_step = -1, volume_step = -1, update_sound = true)`

Replaces the pan and volume positioning values. A negative value copies the current pool default for that setting. Set `update_sound` to `false` to defer the listener relative refresh.

### Owners and groups of sounds

Owners let a game find or update several related slots, such as all sounds attached to one player. Owner searches use prefix matching. For example, a search for `player` also matches `player_7`. Use a nonempty owner for lookup because an empty prefix also matches unused slots.

Source rotation and pivot values are preserved for API compatibility. The current browser audio path stores them but does not use them to change playback positioning.

#### `set_sound_owner(slot, owner, priority = 0)`

Assigns an owner string and numeric priority to a slot. Returns `true` when the slot exists, or `false` otherwise.

#### `get_sound_by_owner(owner, priority = 0)`

Returns the first slot whose owner starts with `owner` and whose priority matches. Returns `-1` when no sound matches.

#### `update_sounds_3d(...)`

```text
pool.update_sounds_3d(owner, x, y, z, rotation = -1)
pool.update_sounds_3d(owner, coordinate, rotation = -1)
```

Moves every nonstationary sound whose owner starts with `owner`. The object form accepts `{ x, y, z }`. A nonnegative `rotation` also updates the source facing value. The method returns `true`, including when no sounds match.

#### `set_sound_rotation(slot, rotation, pivit)`

Sets the source rotation and pivot for one slot. `pivit` is a coordinate object with `x`, `y`, and `z` properties. The parameter name preserves the spelling used by the compatible API. Returns `true` when the slot exists, or `false` otherwise.

#### `set_sounds_rotation(owner, rotation, pivit)`

Sets the source rotation and pivot for every nonstationary sound whose owner starts with `owner`. `pivit` is a coordinate object with `x`, `y`, and `z` properties. Returns `true`, including when no sounds match.

#### `set_sounds_amp(owner, priority, amp)`

Sets the base volume in decibels for every sound whose owner prefix and priority match. Current playback is updated immediately. Returns `true`, including when no sounds match.

#### `destroy_sounds(owner)`

Stops and frees every sound whose owner starts with `owner`. Returns `true`, including when no sounds match.

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

Removes every registered surface and clears the manager's cached sound handles. With the `audio` backend, it calls `stop()` on every cached handle, stopping current playback and preventing pending playback from starting. It does not dispose the audio instance. With the pool backend, it does not stop allocated slots or call `pool.destroy_all()`.

```js
surfaces.clear()
surfaces.hasSurface('wood') // false
```

Returns `undefined`.
