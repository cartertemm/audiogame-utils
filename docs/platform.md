# Platform detection

The `audiogame-utils/platform` module exports browser checks for iOS and installed iOS web apps.

```js
import { isIOS, isIOSStandalone } from 'audiogame-utils/platform'
```

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
