# audiogame-utils

Utilities for building audio games that run in a browser. The package provides
accessible speech output, gestures that use multiple fingers, spatial audio, and
multiplayer network support.

The utilities handle browser behavior that can affect audio games, including iOS
text to speech (TTS) initialization, VoiceOver gesture conflicts, and playback
timing for audio that loads on demand.

The package publishes ECMAScript modules (ESM) and requires no build step. Its
only runtime dependency is [Cacophony](https://www.npmjs.com/package/cacophony).

Install the package:

```sh
npm install audiogame-utils
```

Each stateful module provides a factory function. State belongs to the instance
returned by the factory, so you can create multiple independent instances. Tests
don't require reset hooks.

## Storage

Use `createStorage` to store namespaced preferences as JSON. Other modules accept
the returned storage instance as a dependency.

```js
import { createStorage } from 'audiogame-utils/storage'

const storage = createStorage('mygame')   // Stores keys under "mygame:"
storage.set('difficulty', 'hard')
storage.get('difficulty', 'normal')       // 'hard'
storage.remove('difficulty')
```

If a key is missing or contains invalid JSON, `get` returns the fallback value.
Pass `{ backend }` to use a storage backend other than `localStorage`.

## Speech

Use `speak()` to send output through an ARIA live region, the Web Speech API, or
both.

```js
import { createSpeech, MODE_ARIA, MODE_TTS, MODE_BOTH } from 'audiogame-utils/speech'

const speech = createSpeech({ storage })
speech.speak('Score: 3 to 2')
speech.speak('Goal!', true)              // Interrupts queued TTS and uses an assertive region
```

In `aria` mode, `speak()` writes to a live region. The player's screen reader
uses its configured voice, rate, and verbosity to read the message. In `tts`
mode, `speak()` uses `speechSynthesis`. The `both` mode uses both output methods.
The default mode is `tts` on iOS and `aria` on other platforms. Set
`defaultMode` to change the default.

VoiceOver intercepts gestures that use multiple fingers on iOS. A game that uses
these gestures requires players to turn off VoiceOver, which also prevents ARIA
live region announcements. The `tts` default provides speech output in this
configuration.

```js
button.addEventListener('click', () => {
	speech.primeTts()                     // Call within a user gesture
	startGame()
})
```

iOS Safari requires the first `speechSynthesis.speak()` call in a session to run
within a user gesture. Call `primeTts()` from an event handler for a user gesture.
The function sends an utterance with its volume set to zero. The call has no
audible effect.

The storage instance persists the following voice preferences:
`getVoices`, `getVoice`, `setVoice`, `getRate`, `setRate` (0.1 to 10),
`getPitch`, `setPitch` (0 to 2), `getMode`, `setMode`.

Live regions include inline visually hidden styles. You don't need to import CSS
for them.

## Input

### Gestures

```js
import { createTouch } from 'audiogame-utils/input'

const touch = createTouch({ maxTapCount: 3 })
touch.on('swipe', e => console.log(e.direction, e.fingerCount))
touch.on('tap', e => console.log(e.tapCount, e.fingerCount, e.x, e.y))
```

`createTouch` tracks a gesture from the first touch until the last touch ends. It
classifies the gesture when the last touch ends by using the centroid of all
participating touches. This method recognizes a swipe with three fingers when the
fingers start at different times or travel different distances. `fingerCount`
reports the highest number of simultaneous touches in the gesture.

The input handler waits for `multiTapWindow` before emitting a tap so that it can
combine consecutive taps into a double or triple tap. It emits the event
immediately when the tap count reaches `maxTapCount`.

`createTouch` accepts the following options: `target`, `tapMaxDistance`,
`tapMaxDuration`, `swipeMinDistance`, `swipeMaxDuration`, `multiTapWindow`,
`multiTapMaxDistance`, and `maxTapCount`.

Touch handlers call `preventDefault`. This behavior prevents scrolling when the
handler targets a scrollable page. Pass `target` to limit touch handling to a
specific element.

### Keyboard and mouse

```js
import { createKeyboard, createMouse } from 'audiogame-utils/input'

const keyboard = createKeyboard()
keyboard.isDown('arrowleft')
keyboard.on('keypress', e => ...)        // Reports the initial press only

const mouse = createMouse()
mouse.getPosition()                       // { x, y }
mouse.isButtonDown()
```

### Named actions

```js
import { createInputHandler, formatBinding } from 'audiogame-utils/input'

const input = createInputHandler({ keyboard, touch })
input.bind('moveLeft', { hold: ['arrowleft', 'a'] })
input.bind('pause', { press: ['p'], tap: [{ fingerCount: 2, tapCount: 1 }] })
input.bind('menu', { swipe: [{ direction: 'up', fingerCount: 3 }] })

// in the game loop
if (input.wasTriggered('moveLeft')) ...   // Polls and consumes discrete triggers
// in menu code
input.on('pause', () => ...)              // push
```

Tap and swipe specifications match the properties that you provide. An empty
object (`{}`) matches any tap. `{ direction: 'left' }` matches a left swipe with
any number of fingers.

Use `describe()` to generate controls help from the current action bindings. The
generated help stays synchronized with the configured controls.

```js
for (const action of input.describe()) {
	const keys = action.bindings.map(formatBinding).join(', ')
	speech.speak(`${action.name}: ${keys}`)
	// "pause: P, Two finger tap"
}
```

## Audio

```js
import { createAudio } from 'audiogame-utils/audio'

const audio = createAudio()
const sounds = {
	hit:  audio.sfx(() => import('./sounds/hit.ogg?url')),
	loop: audio.sfx('/sounds/table.ogg'),
}

await audio.preload()                     // Optional; defaults to loading on first play
```

A source can be a URL string, a function that returns a URL, or a function that
returns a bundler module object. The package fetches audio and creates an
`AudioContext` when you first call `play()` or `preload()`. You can declare the
sound table at module scope without starting audio initialization. If the
environment doesn't provide `AudioContext`, audio handle methods have no effect
and don't throw errors. This behavior allows tests to import audio handles.

```js
sounds.hit.play({ volume: 0.8, pan: -0.4 })
sounds.loop.play({ loop: true, volume: 0.35 })
sounds.loop.update({ pan, volume })       // Adjusts a playing sound
sounds.loop.rampPitch({ from: 0.5, to: 1, durationMs: 1000 })
await sounds.loop.stop()
```

`play({ loop: true })` is idempotent. You can call it every frame while a loop
should play. Calling `stop()` invalidates a pending `play()` call, so audio that
finishes loading after `stop()` doesn't begin playback.

Use `play({ position: [x, y, z] })` and `setPosition()` to control Cacophony's 3D
audio positioning.

## Networking

```js
import { createReconnectingClient, wrapSocket, createIdentity } from 'audiogame-utils/net'

const client = createReconnectingClient({
	url: 'wss://example.com/ws',
	onOpen: sock => sock.send({ type: 'hello', ...identity.get() }),
	onMessage: msg => handle(msg),
	onClose: event => ...,
	onError: err => ...,
})
```

The reconnect delay starts at 500 ms, increases to a maximum of 15 seconds, and
resets after a successful connection. `onOpen` runs for the initial connection
and every reconnection. Use it to send a resume handshake. `close()` closes the
active socket and cancels any pending reconnection.

The default codec uses JSON. Pass `{ encode, decode }` to use another wire
format. A decoding error invokes `onError` and leaves the socket open.

`wrapSocket` applies the codec to a browser socket or a `ws` socket on a server.
`createReconnectingClient` supports browser sockets only.

```js
const identity = createIdentity(storage)
identity.set({ name: 'Swift Otter' })     // Merges with the current identity
identity.get()                            // { clientId, sessionToken, name }
identity.clear()
```

## Platform detection and events

```js
import { isIOS, isIOSStandalone } from 'audiogame-utils/platform'
import { EventEmitter } from 'audiogame-utils/events'
```

`isIOS()` detects iPadOS 13 and later when the browser reports a Macintosh user
agent with support for multiple touches. `EventEmitter` provides the `on`, `off`,
and `emit` methods without adding another runtime dependency.

## Testing

The test suite uses Vitest with happy-dom. Run `npm test`.

## License

MIT
