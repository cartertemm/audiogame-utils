# Tauri

Tauri turns a web application into an installable application for Windows, macOS, Linux, Android, or iOS. An audiogame can keep its HTML, CSS, and JavaScript while gaining a native application window, saves stored in files, desktop installers, and other operating system features.

This guide assumes that you know JavaScript. It explains Tauri and the native application concepts needed to package a game. The main path covers desktop development and distribution. A shorter mobile section provides the starting commands and links to Tauri's full mobile documentation.

## What is Tauri?

A browser normally displays a web application in a tab. Tauri displays that application in a webview instead. A webview is a browser component embedded inside an application window. It runs the same HTML, CSS, JavaScript, audio, and accessibility APIs that a browser page uses, but it does not include the browser's tabs, address bar, or menus.

A Tauri application has two main parts:

1. The frontend contains the game's HTML, CSS, JavaScript, sounds, and other bundled files. It runs inside the webview.
2. The native core creates windows, packages the application, and gives approved frontend code access to operating system features. Tauri builds this part with Rust.

You do not need to know Rust for the workflow in this guide. The Tauri tools create and maintain the small Rust project that hosts the game. You can add Rust code later if the game needs native behavior that a plugin does not provide.

For most audiogames, Tauri is a better fit than Electron. Both can turn a JavaScript application into a desktop application, but Electron packages Chromium and Node.js with every application. Tauri uses the operating system's webview instead. This usually produces smaller installers and often uses less idle memory, while preserving the browser based development model used by audiogame utils.

The tradeoff is that Electron supplies the same browser engine on every desktop system. Tauri uses a different system webview on Windows, macOS, and Linux, so browser API support can vary. Test every operating system that you plan to support.

See [Tauri's architecture guide](https://v2.tauri.app/concept/architecture/) for a deeper description of its parts.

## Step 1: Install the required tools

Tauri compiles a native program on your computer. This requires Rust and the build tools for your operating system. Windows uses the Microsoft C++ Build Tools and WebView2. macOS uses Xcode or its command line tools. Linux requires packages supplied by the distribution.

Follow [Tauri's prerequisites guide](https://v2.tauri.app/start/prerequisites/) for the current instructions for your operating system. Those requirements change more often than this library.

After installing Rust, open a new terminal and check both commands:

```console
rustc --version
cargo --version
```

You also need one JavaScript runtime and package manager. npm and Deno are both supported.

For npm, install a current Node.js LTS release, then check it:

```console
node --version
npm --version
```

For Deno, install Deno 2 or later, then check it:

```console
deno --version
```

If a command is not found, restart the terminal after installation. On Windows, a restart of the computer may also be required after installing the native build tools.

## Step 2: Create or convert a project

Choose the path that matches your game. Both paths produce a normal frontend directory and a `src-tauri` directory containing the native project.

### Start a new game

Run Tauri's project creator with npm:

```console
npm create tauri-app@latest
```

Or run it with Deno:

```console
deno run -A npm:create-tauri-app
```

The exact prompts may change between Tauri releases. For a plain JavaScript game, choose these options when they are offered:

1. Choose TypeScript or JavaScript as the frontend language.
2. Choose npm or Deno as the package manager.
3. Choose Vanilla as the interface template.
4. Choose JavaScript as the interface flavor.

Enter the created directory and install its dependencies. Replace `my-game` with the project name you selected.

With npm:

```console
cd my-game
npm install
```

With Deno:

```console
cd my-game
deno install
```

The project contains familiar frontend files such as `index.html` and a `src` directory. The `src-tauri` directory contains native configuration, Rust source, permissions, icons, and build metadata. Most work on the game will still happen in the frontend files.

Continue at [Step 3: Add audiogame utils](#step-3-add-audiogame-utils).

### Convert an existing browser game

An existing game can use plain HTML, CSS, JavaScript, and asset files without adding a build tool. Tauri can serve that directory during development and package it directly. If the game already uses Vite or a similar tool, Tauri can run its development and build commands instead. Server rendered pages must produce a static build because this workflow does not package a server process.

Install the Tauri command line interface with npm:

```console
npm install -D @tauri-apps/cli@latest
npx tauri init
```

Or install and run it with Deno:

```console
deno add -D npm:@tauri-apps/cli@latest
deno task tauri init
```

`tauri init` asks how to find, run, and build the existing frontend. Provide:

1. The application name and window title.
2. Leave the development server URL and command empty for a plain static game. For Vite, these might be `http://localhost:5173` and `npm run dev` or `deno task dev`.
3. Leave the frontend build command empty when no build step exists. Otherwise, enter the project's build command.
4. Enter the directory containing the files Tauri should package. This might be `..` for a static game whose `index.html` is next to `src-tauri`, or `../dist` for a Vite build.

The command creates `src-tauri` without replacing the existing frontend.

## Step 3: Add audiogame utils

Run the repository patcher from the Tauri project directory.

With npm:

```console
npx audiogame-utils create
```

With Deno:

```console
deno run -A jsr:@cartertemm/audiogame-utils/create
```

The patcher detects the project's package manager and makes these changes:

1. It installs audiogame utils and the Tauri API, store, and opener packages.
2. It runs Tauri's plugin setup for the store and opener plugins. This updates the Rust project and grants their default capability permissions.
3. It adds a content security policy that permits bundled audio and approved asset protocol URLs when the project does not already have a policy.
4. It enables Tauri's asset protocol with an empty path scope when the project does not already configure it.
5. It writes a small `src/game.js` example when that file does not already exist.
6. It can add a GitHub Actions workflow that builds Windows, macOS, and Linux artifacts when a version tag is pushed.

Existing `src/game.js` and workflow files are kept, along with any preexisting content security policy and asset protocol settings.

The patcher accepts an optional project directory:

```console
npx audiogame-utils create ../my-game
```

```console
deno run -A jsr:@cartertemm/audiogame-utils/create ../my-game
```

These flags control its prompts:

| Flag | Effect |
| --- | --- |
| `--ci` | Add the GitHub Actions workflow without asking. |
| `--no-ci` | Do not add the workflow. |
| `--yes` | Accept the default answer for every remaining prompt. The current default adds the workflow. |

Load `src/game.js` from the project's `index.html`, or copy its initialization into the game's existing entry module.

## Step 4: Run the desktop application

Start development mode with npm:

```console
npx tauri dev
```

Or with Deno:

```console
deno task tauri dev
```

Tauri starts the configured frontend server, or serves static files itself, then compiles the native core and opens the game in an application window. The first Rust build may take several minutes because it downloads and compiles native dependencies. Later builds reuse cached work and are much faster.

Changes to frontend files normally reload in the Tauri window just as they do in a browser. Changes under `src-tauri` may trigger a native rebuild.

## Step 5: Initialize the runtime

Call `initRuntime()` before creating storage, speech, or another module that may need a native adapter:

```js
import { createSpeech, createStorage } from 'audiogame-utils'
import { initRuntime } from 'audiogame-utils/runtime'
import { setTitle } from 'audiogame-utils/window'

await initRuntime()

const storage = createStorage('my-game')
const speech = createSpeech({ storage })

speech.init()
await setTitle('My game')
speech.speak('Ready')
```

In a browser, `initRuntime()` resolves immediately with `'web'`, which tells audiogame-utils to use normal web storage, window, and file routines. In Tauri, it loads saved values into memory, then registers adapters for storage, window control, and file path conversion before resolving with `'tauri'`. Loading the values first lets later `storage.get()` calls remain synchronous even though Tauri reads the store from disk asynchronously.

Calls made while initialization is in progress share the same promise. If initialization rejects, the cached promise is cleared so a later call can retry. If the call is skipped, the first module that requests a missing native capability writes a warning to the console and reminds you to call `initRuntime()` to fix it.

## Step 6: Save data to disk

Create storage in the usual way:

```js
import { createStorage } from 'audiogame-utils/storage'

const storage = createStorage('my-game')

storage.set('difficulty', 'hard')
console.log(storage.get('difficulty'))
```

In a browser, this uses `localStorage`. In Tauri, the store plugin saves the same namespaced JSON values in `audiogame-utils.json` under the application's data location for the operating system.

Tauri disk operations are asynchronous, while `storage.get()` is synchronous. The adapter solves this by keeping the store in memory. A change updates memory immediately and schedules one disk write 200 milliseconds later. Several changes inside that interval produce one save.

The delay means an immediate crash may lose the most recent change. Call `flush()` after an important event, such as saving progress or changing settings.

```js
storage.set('checkpoint', 12)
await storage.flush()
```

On the web, `flush()` resolves immediately because `localStorage` writes synchronously. Under Tauri, it cancels the pending timer and saves now. If the disk write fails, `flush()` rejects and keeps the changed values in memory so a later flush can retry. A failed background write just warns in the console.

## Step 7: Control the application window

Import window operations from `audiogame-utils/window`:

```js
import {
	isFullscreen,
	onCloseRequest,
	openUrl,
	quit,
	setTitle,
	toggleFullscreen,
} from 'audiogame-utils/window'

await setTitle('Echo Hall')

if (!(await isFullscreen())) {
	await toggleFullscreen()
}

const removeCloseGuard = onCloseRequest(() => {
	if (canQuit()) return true
	speech.speak('Finish or save the current round before quitting.')
	return false
})

helpButton.addEventListener('click', async () => {
	await openUrl('https://example.com/help')
})
```

Returning `false` from the close handler asks Tauri to keep the window open. Call the returned `removeCloseGuard()` function when the handler is no longer needed.

The browser fallbacks use `false` when an operation is unavailable or refused. For example, `quit()` resolves `false` because a page cannot close its own tab. Browser fullscreen and wake lock requests can also resolve `false` when the platform refuses them.

Native title, fullscreen, state, and quit calls resolve successfully when Tauri accepts them. Their promises reject if the underlying Tauri operation fails, so handle a rejection when the game needs to recover or explain the failure.

Use `openUrl()` for documentation, community pages, purchases, and other external sites. Under Tauri, the opener plugin sends the URL to the user's default browser. A normal link can replace the page inside the game webview, ending the running game session and disorienting the player. On the web, `openUrl()` opens a new browser tab.

When the game is ready to close itself, use:

```js
await quit()
```

## Step 8: Load bundled and external assets

Files included in the frontend build use normal root relative URLs:

```js
const step = audio.sfx('/sounds/step.ogg')
```

Tauri serves the packaged frontend from its origin root, so the same URL works during browser development and in an installed application.

A file outside the frontend bundle has an operating system path instead of a web URL. Convert it before passing it to an audio or DOM API:

```js
import { fileUrl } from 'audiogame-utils/platform'

const downloadedStep = audio.sfx(fileUrl(pathFromDisk))
```

`fileUrl()` returns the path unchanged in a browser. Under Tauri, it converts the path to an asset protocol URL.

Tauri only serves external files that match `app.security.assetProtocol.scope` in `src-tauri/tauri.conf.json`. The patcher enables the protocol but leaves its scope empty, so no operating system path is exposed by default. Add only the directory that contains the files the game needs. For example, this permits files inside a `sound-packs` directory under the application's data directory:

```json
{
	"app": {
		"security": {
			"assetProtocol": {
				"enable": true,
				"scope": ["$APPDATA/sound-packs/**/*"]
			}
		}
	}
}
```

A broad scope can expose private files to frontend code if that code is compromised. Prefer one application owned directory over a home directory or unrestricted filesystem pattern. See [Tauri's asset protocol scope guide](https://v2.tauri.app/security/asset-protocol/) for path variables, glob rules, and deny rules.

## Step 9: Build desktop installers

Create a release build with npm:

```console
npx tauri build
```

Or with Deno:

```console
deno task tauri build
```

Tauri builds the frontend, compiles an optimized native executable, and creates the installer formats configured for the current operating system. Build output goes under `src-tauri/target/release`. Installer files are normally inside its `bundle` directory. The command prints the exact paths because the formats and nested directories vary by platform.

A normal local build targets the operating system running the command. Build on Windows for Windows, macOS for macOS, and Linux for Linux. The optional workflow created by the patcher runs all three builds in GitHub Actions. It uses npm for npm based projects and Deno for Deno based projects. It runs when a tag beginning with `v` is pushed and creates a draft GitHub release.

The generated artifacts are unsigned. Signing proves who published an application and prevents common operating system warnings. Certificates, notarization, and store requirements differ by platform and are not included by the patcher.

Continue with Tauri's maintained [distribution and signing guide](https://v2.tauri.app/distribute/#signing) before giving installers to players.

## Step 10: Start a mobile build

Tauri also targets Android and iOS, but mobile development requires additional tools. Android needs Android Studio, the Android SDK, an NDK, Java, and Rust mobile targets. iOS development requires macOS, full Xcode, CocoaPods, and Rust iOS targets.

Follow [Tauri's mobile prerequisites](https://v2.tauri.app/start/prerequisites/#configure-for-mobile-targets) before running these commands.

Tauri's built in server handles a plain static project. If the project uses its own development server on a physical device, configure that server to listen on the address in `TAURI_DEV_HOST`. Projects created with Tauri's project creator include this mobile configuration. The mobile development guide linked below explains the settings for each frontend tool.

Initialize, run, and build Android with npm:

```console
npx tauri android init
npx tauri android dev
npx tauri android build
```

Or with Deno:

```console
deno task tauri android init
deno task tauri android dev
deno task tauri android build
```

Initialize, run, and build iOS with npm on macOS:

```console
npx tauri ios init
npx tauri ios dev
npx tauri ios build
```

Or with Deno on macOS:

```console
deno task tauri ios init
deno task tauri ios dev
deno task tauri ios build
```

The `init` command creates the native mobile project. The `dev` command runs it on a selected device or simulator. The `build` command creates release output.

Mobile certificates, device setup, application icons, permissions, store records, and submissions are separate topics. Continue with Tauri's [mobile development guide](https://v2.tauri.app/develop/#developing-your-mobile-application) and [mobile distribution guides](https://v2.tauri.app/distribute/).

## Step 11: Check platform capabilities

Tauri does not replace browser APIs with identical native implementations. Speech uses the same ARIA live regions and Web Speech API used by the browser version. Gamepads, rumble, wake locks, audio formats, and other web features depend on the operating system webview.

Check capabilities before giving instructions to a player. For example:

```js
import { createGamepad } from 'audiogame-utils/input'

const gamepad = createGamepad()

if (!gamepad.supported) {
	speech.speak('Gamepad input is not available on this system.')
}
```

Webview support can change as operating systems update. Test input, speech, audio, fullscreen, wake locks, and external links on every target release.

## Troubleshooting

### A native build tool is missing

Read the first error from `tauri dev` or `tauri build`, then revisit [Tauri's prerequisites](https://v2.tauri.app/start/prerequisites/) for the current operating system. Installing JavaScript packages cannot replace a missing C++ compiler, Xcode component, or Linux system package.

### The first build appears stuck

The first native build downloads and compiles Rust dependencies. It can take several minutes and should continue printing compiler progress. Later builds use the Cargo cache.

### Native adapters failed to load

Run the patcher again from the project root. If the project was configured manually, install the required packages.

With npm:

```console
npm install audiogame-utils @tauri-apps/api @tauri-apps/plugin-store @tauri-apps/plugin-opener
```

With Deno:

```console
deno add npm:audiogame-utils npm:@tauri-apps/api npm:@tauri-apps/plugin-store npm:@tauri-apps/plugin-opener
```

Then confirm that `await initRuntime()` runs before storage or window operations.

### Storage works in the browser but does not persist under Tauri

Confirm that `await initRuntime()` finishes before `createStorage()`. Check the console for adapter and store write warnings. Use `await storage.flush()` and handle a rejected promise to expose a disk write failure at a known point.

### An external sound file is blocked

Bundled files do not need `fileUrl()`. Operating system paths do. Pass the path through `fileUrl()`, then add its directory to `app.security.assetProtocol.scope`. Keep the scope narrow.

### A help link replaces the game

Use `openUrl()` from `audiogame-utils/window` instead of navigating the Tauri webview to an external page.

### The installer produces an identity warning

Local and generated workflow builds are unsigned. Configure signing and, on macOS, notarization before public distribution.

## Public API reference

Most games only need `initRuntime()` plus the regular storage, platform, and window modules. The functions under `audiogame-utils/tauri` are available for projects that need custom adapter initialization.

### `initRuntime(options)`

Import from `audiogame-utils/runtime`.

Detects the current runtime and registers native adapters when running under Tauri. It returns a promise that resolves with `'web'` or `'tauri'`. Calls share one promise while initialization is pending or completed. A rejection clears that promise so a later call can retry.

| Option | Default | Description |
| --- | --- | --- |
| `storeFile` | `audiogame-utils.json` | File name used by the Tauri store plugin. |
| `writeDelayMs` | `200` | Milliseconds to wait before writing changed storage values to disk. |

```js
const runtime = await initRuntime({
	storeFile: 'echo-hall.json',
	writeDelayMs: 100,
})
```

The options have no effect on the web path. Initialization rejects under Tauri when its adapters or required peer packages cannot load.

### `setup(options)`

Import from `audiogame-utils/tauri`.

Creates and registers the Tauri storage, window, and file adapters directly. Its options are `storeFile` and `writeDelayMs`, with the same defaults as `initRuntime()`. It resolves with an object containing the created `storage` backend.

```js
import { setup } from 'audiogame-utils/tauri'

const { storage } = await setup({ storeFile: 'echo-hall.json' })
```

Unlike `initRuntime()`, `setup()` does not detect the runtime and does not share one initialization promise. Call it only inside Tauri.

### `createTauriStorageBackend(options)`

Import from `audiogame-utils/tauri`.

Creates a storage backend without registering it. It reads the store into memory before resolving.

| Option | Default | Description |
| --- | --- | --- |
| `file` | `audiogame-utils.json` | File name used by the Tauri store plugin. |
| `writeDelayMs` | `200` | Milliseconds to wait before a scheduled disk write. |

The returned backend implements these methods:

| Method | Description |
| --- | --- |
| `getItem(key)` | Returns the cached string or `null`. |
| `setItem(key, value)` | Updates the cache and schedules a disk write. Values are converted to strings. |
| `removeItem(key)` | Removes the cached value and schedules its deletion from disk. |
| `flush()` | Writes pending changes immediately. It rejects on failure and leaves them available for a retry. |

Pass this backend to `createStorage()` only when custom registration or isolation is required. Normal games receive it automatically through `initRuntime()`.

### `createTauriWindow()`

Import from `audiogame-utils/tauri`.

Creates a window controller for the current Tauri window. It implements the same interface exported through `audiogame-utils/window`:

| Method | Result | Description |
| --- | --- | --- |
| `setTitle(text)` | `Promise<true>` | Sets the native window title. Rejects if Tauri refuses the change. |
| `setFullscreen(on)` | `Promise<true>` | Enters or leaves fullscreen. Rejects if the native operation fails. |
| `isFullscreen()` | `Promise<boolean>` | Resolves whether the window is fullscreen. Rejects if the state cannot be read. |
| `toggleFullscreen()` | `Promise<true>` | Inverts the current fullscreen state. Rejects if a native operation fails. |
| `quit()` | `Promise<true>` | Closes the current window. Rejects if Tauri cannot close it. |
| `onCloseRequest(handler)` | Cleanup function | Runs a handler before closing and returns a function that removes it. Returning `false` blocks the close. |
| `keepAwake(on)` | `Promise<boolean>` | Requests or releases the webview's screen wake lock. Resolves `false` when unavailable or refused. |
| `openUrl(url)` | `Promise<boolean>` | Opens an external URL through the opener plugin, with a web fallback if the plugin is unavailable. |
