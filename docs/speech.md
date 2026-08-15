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

## Preferences

Speech preferences are stored under these keys within the storage namespace:

| Preference | Methods | Valid values |
| --- | --- | --- |
| Mode | `getMode()`, `setMode(mode)` | `MODE_ARIA`, `MODE_TTS`, or `MODE_BOTH` |
| Voice | `getVoices()`, `getVoice()`, `setVoice(voice)` | A `SpeechSynthesisVoice` or voice URI string |
| Pitch | `getPitch()`, `setPitch(value)` | A number from 0 through 2 |
| Rate | `getRate()`, `setRate(value)` | A number from 0.1 through 10 |

The stored keys are `speechMode`, `speechVoice`, `speechPitch`, and `speechRate`. Pitch and rate default to 1. `getVoice()` returns `null` when no voice is selected or the selected voice is no longer available.

## Cleanup

Call `dispose()` to cancel pending live region timers and remove the generated regions. A disposed instance can create its regions again if it is reused.
