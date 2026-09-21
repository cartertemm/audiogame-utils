# Speech

The `audiogame-utils/speech` module provides accessible announcements through ARIA live regions, the Web Speech API, or both.

```js
import {
	createSpeech,
	MODE_ARIA,
	MODE_TTS,
	MODE_BOTH,
} from 'audiogame-utils/speech'
import { createStorage } from 'audiogame-utils/storage'

const storage = createStorage('mygame')
const speech = createSpeech({ storage })
```

## Creating a speech instance

`createSpeech(options)` requires a storage instance. It accepts these options:

| Option | Description |
| --- | --- |
| `storage` | Required storage used for speech preferences. |
| `defaultMode` | Initial mode when no preference is stored. Defaults to `MODE_TTS` on iOS and `MODE_ARIA` elsewhere. |
| `idPrefix` | Prefix for generated live region IDs. Defaults to `speech`. Use a unique value when creating multiple instances. |

The mode constants have the values `aria`, `tts`, and `both`.

## Speaking

Call `speak(text, interrupt)` to announce text. The optional `interrupt` argument defaults to `false`.

```js
speech.speak('Score: 3 to 2')
speech.speak('Goal!', true)
```

ARIA mode writes normal messages to a polite live region. Interrupted messages use an assertive live region. The regions are visually hidden with inline styles and are created automatically on the first ARIA announcement. Call `init()` to create them earlier.

TTS mode creates a `SpeechSynthesisUtterance`. An interrupted message cancels queued speech before it is spoken. Both mode performs the ARIA and TTS operations together.

## Priming text to speech on iOS

iOS Safari requires the first `speechSynthesis.speak()` call in a session to run within a user gesture. Call `primeTts()` synchronously in a click or tap handler, before any `await`:

```js
button.addEventListener('click', () => {
	speech.primeTts()
	startGame()
})
```

The priming utterance has zero volume.

## Native speech under Tauri

When the game runs under Tauri and the prism plugin is installed, `initRuntime()` registers a native speech adapter and `native` becomes the default mode. Native mode sends text to the player's screen reader, or to a system speech engine when no screen reader is running, through prism. Braille displays receive the same text.

If the plugin is missing or prism finds no backend, the adapter logs one warning and the web modes stay in use. `setMode(MODE_NATIVE)` throws in that case, so hide the option when `getBackendName()` returns `null`. If a native `speak` call fails at runtime, the instance warns once and repeats the text through the live region.

See the [Tauri guide](tauri.md#step-12-native-screen-reader-output) for the install steps.

## Stopping

`stop()` cancels output in the active mode. Native mode stops the backend, `tts` cancels queued utterances, and `aria` clears both live regions.

## Preferences

Speech preferences are stored under these keys within the storage namespace:

| Preference | Methods | Valid values |
| --- | --- | --- |
| Mode | `getMode()`, `setMode(mode)` | `MODE_NATIVE`, `MODE_ARIA`, `MODE_TTS`, or `MODE_BOTH` |
| Voice | `getVoices()`, `getVoice()`, `setVoice(voice)`, `onVoicesChanged(handler)` | A `{ id, name, language }` object or its `id` |
| Pitch | `getPitch()`, `setPitch(value)` | A number from 0 through 1. 0.5 is normal. |
| Rate | `getRate()`, `setRate(value)` | A number from 0 through 1. 0.5 is normal. |
| Volume | `getVolume()`, `setVolume(value)` | A number from 0 through 1 |

Rate, pitch, and volume use the same scale in every mode. In `tts` mode the instance converts them to Web Speech values, so a rate of 0.5 speaks at the engine's normal speed and 1 speaks at twice that. Versions before 0.4.0 exposed the Web Speech scales directly.

Rate and pitch default to 0.5 and volume to 1. `getVoice()` returns `null` when no voice is selected or the selected voice is no longer available.

Voices have one shape in every mode. In `tts` mode the `id` is the Web Speech `voiceURI`. In native mode it is the backend's voice index as a string. Because ids differ between engines, the selected voice is stored under `speechVoice` for `tts` and `nativeVoice` for native. Rate, pitch, and volume are stored once under `speechRate`, `speechPitch`, and `speechVolume` and apply to whichever mode is active.

`getVoices()` in native mode returns the last known list and refreshes it in the background. The first call returns an empty list. Pass a handler to `onVoicesChanged()` to redraw when the list arrives. The same handler fires for the browser's `voiceschanged` event in `tts` mode.

`features()` returns `{ voice, rate, pitch, volume }` flags for the active mode. Screen reader backends such as NVDA report every flag as `false`, so settings screens can hide controls that would have no effect.

## Cleanup

Call `dispose()` to cancel pending live region timers and remove the generated regions. A disposed instance can create its regions again if it is reused.
