# audiogame-utils

Building blocks for audio games that run in a browser. It currently has helpers for accessible speech, keyboard, mouse and multifinger input, spatial audio, menus and forms, maps and spatial queries, storage, platform detection, and multiplayer connections.

The package publishes ECMAScript modules and requires no build step. Its only runtime dependency is [Cacophony](https://www.npmjs.com/package/cacophony) for sound playback.

## Requirements

Local development requires Node.js (and npm) or Deno 2+.

## Installation

Install the package directly from GitHub:

```sh
npm install github:cartertemm/audiogame-utils
```

## Usage

Import common tools from the package root or use a public module path for more focused imports:

```js
import { createStorage, createSpeech } from 'audiogame-utils'
import { createAudio } from 'audiogame-utils/audio'

const storage = createStorage('my-game')
const speech = createSpeech({ storage })
const audio = createAudio()

speech.init()
const startSound = audio.sfx('/sounds/start.ogg')
```

### Deno

In Deno 2 or later, import directly using the `npm:` specifier. Deno resolves the subpaths from the package.json `exports` map:

```js
import { createStorage, createSpeech } from 'npm:audiogame-utils'
import { createAudio } from 'npm:audiogame-utils/audio'
```

See [examples/](examples/) for more of what you can do.

## Modules

| Module | Import path | Purpose |
| --- | --- | --- |
| [Package root](src/index.js) | `audiogame-utils` | Common exports from across the package. |
| [Audio](docs/audio.md) | `audiogame-utils/audio` | Lazy sound loading and playback through Cacophony. |
| [Audio pool](src/audio/pool.js) | `audiogame-utils/audio/pool` | Reusable spatial sound sources and listener updates. |
| [Audio coordinates](src/audio/coords.js) | `audiogame-utils/audio/coords` | Game coordinate and listener relative audio positions. |
| [Audio units](src/audio/units.js) | `audiogame-utils/audio/units` | Volume, pan, pitch, playback rate, and distance conversions. |
| [Clock](docs/clock.md) | `audiogame-utils/clock` | 60 FPS game loop timing, delta time calculations, and countdown timers. |
| [Events](docs/events.md) | `audiogame-utils/events` | A small event emitter. |
| [Focus](docs/focus.md) | `audiogame-utils/focus` | Keyboard trapping for gameplay using a virtual cursor. |
| [Input](docs/input.md) | `audiogame-utils/input` | Keyboard, mouse, touch gesture, and named action input. |
| [Maps](docs/map.md) | `audiogame-utils/map` | Representation of spatial data, map loading, queries, and serialization. Able to load maps with hundreds of thousands of objects in less than a second. |
| [Math](docs/math.md) | `audiogame-utils/math` | Range, angle, interpolation, and randomization helpers. |
| [Networking](docs/net.md) | `audiogame-utils/net` | WebSocket messaging, reconnection, and player identity. |
| [Physics](docs/physics.md) | `audiogame-utils/physics` | Static R tree spatial indexing for now, more to be added soon. |
| [Platform detection](docs/platform.md) | `audiogame-utils/platform` | iOS and installed web app detection. |
| [Rotation](docs/rotation.md) | `audiogame-utils/rotation` | Direction, movement, distance, and spatial math helpers. |
| [Speech](docs/speech.md) | `audiogame-utils/speech` | Accessible output through live regions and text to speech. Sets sensible platform defaults (TTS on iOS, screen reader everywhere else). |
| [Stats](docs/stats.md) | `audiogame-utils/stats` | Stat tracking, formatted output, list sorting, set operations, and linear/JSON serialization. |
| [Storage](docs/storage.md) | `audiogame-utils/storage` | Namespaced JSON storage. Saves to the browser session by default. |
| [Text](docs/text.md) | `audiogame-utils/text` | sequence to string conversion, time formatting, string distance, and closestMatch helpers. |
| [UI](docs/ui.md) | `audiogame-utils/ui` | Helpers for quickly creating accessible fields, screens, and menus. With the exception of menu (which is my take on the dynamic menu commonly found in audio games), these should not be used with a focus trap but games where you want an interactive visible UI. |

## Local development

Clone your fork and open the repository directory. Then install the dependencies and run the test suite:

```sh
npm install
npm test
```

Or run tests under Deno using the Deno task:

```sh
deno task test:deno
```

The tests use Vitest with happy-dom. Run `npm run test:watch` while developing to rerun tests when files change.

## Contributing

Bug reports and pull requests are welcome. Open an issue before starting a substantial change so the approach can be discussed first.

Keep changes focused, add or update tests for changed behavior, and run `npm test` before submitting a pull request. Include a clear description of the problem and the solution in the pull request.

## License

This project is available under the [MIT License](LICENSE).
