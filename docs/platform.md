# Platform detection

The `audiogame-utils/platform` module detects the runtime and operating system, resolves paths for external files, and provides the capability registry used by native adapters.

```js
import { fileUrl, isMobile, os, runtime } from 'audiogame-utils/platform'
```

## Runtime and operating system

### `runtime()`

Returns `'tauri'` when the page is running inside Tauri, or `'web'` otherwise. Detection uses globals injected by Tauri and does not depend on the user agent.

```js
if (runtime() === 'tauri') {
	enableDesktopFeatures()
}
```

### `os()`

Returns `'windows'`, `'macos'`, `'linux'`, `'ios'`, `'android'`, or `'unknown'` based on the browser user agent. It returns `'unknown'` when `navigator` is unavailable or the operating system cannot be identified.

### `isMobile()`

Returns `true` when `os()` returns `'ios'` or `'android'`.

## `isIOS()`

Returns `true` for iPhone, iPad, and iPod user agents. It also detects iPadOS 13 and later when Safari reports a Macintosh user agent and the device supports more than one simultaneous touch point.

The function reads `navigator` and `window`, so call it in a browser environment.

```js
if (isIOS()) {
	configureIOSAudio()
}
```

## `isIOSStandalone()`

Returns `true` when `isIOS()` is true and `window.navigator.standalone` is true. This identifies an iOS web app launched from the home screen.

```js
if (isIOSStandalone()) {
	showInstalledAppHelp()
}
```

## External file paths

### `fileUrl(path)`

Converts an operating system file path into a URL that the current webview can load. It returns the path unchanged on the web or when no native file capability is registered.

Bundled assets do not need this conversion. A root relative path such as `/sounds/beep.ogg` works in both a browser and a packaged Tauri application. Use `fileUrl` for files outside the bundle, under a path provided by the operating system.

```js
const source = fileUrl(soundPackPath)
```

## Capability registry

Most games do not need to call the registry functions directly. Native adapters register implementations that regular modules can use without importing Tauri dependencies.

### `register(name, implementation)`

Registers a capability implementation under `name`. This is intended for adapters.

### `capability(name)`

Returns the registered implementation, or `null` when none exists. Under Tauri, a missing capability warns once for each name because it usually means the game did not await `initRuntime()` before using the library.

### `resetCapabilities()`

Clears registered capabilities and warning state. This is a testing seam.
