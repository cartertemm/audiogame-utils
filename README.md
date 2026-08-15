# audiogame-utils

Utilities for building audio games that run in a browser. The package provides accessible speech output, keyboard, mouse and multi-finger input, spatial audio, browser platform detection, and multiplayer support.

The package publishes ECMAScript modules and requires no build step. Its only runtime dependency is [Cacophony](https://www.npmjs.com/package/cacophony) for sound playback.

## Requirements

Local development requires Node.js and npm.

## Installation

Install the package from GitHub:

```sh
npm install https://github.com/audiogame-utils
```

## Local development

Clone your fork and open the repository directory. Then install the dependencies and run the test suite:

```sh
npm install
npm test
```

The tests use Vitest with happy-dom. Run `npm run test:watch` while developing to rerun tests when files change.

## Example playground

From the repository root, start the example server:

```sh
npm run examples
```

Open <http://localhost:3000> in a browser and choose a demo from the index page.

Run the server from the repository root because the examples import modules directly from `src`. Do not open the example HTML files directly. Browsers block their module imports when loaded from `file:` URLs.

## Documentation

Documentation is organized by public import path:

1. [Audio](docs/audio.md)
2. [Events](docs/events.md)
3. [Input](docs/input.md)
4. [Networking](docs/net.md)
5. [Platform detection](docs/platform.md)
6. [Rotation and spatial math](docs/rotation.md)
7. [Speech](docs/speech.md)
8. [Storage](docs/storage.md)
9. [UI](docs/ui.md)

## Contributing

Bug reports and pull requests are welcome. Open an issue before starting a substantial change so the approach can be discussed first.

Keep changes focused, add or update tests for changed behavior, and run `npm test` before submitting a pull request. Include a clear description of the problem and the solution in the pull request.

## License

This project is available under the [MIT License](LICENSE).
