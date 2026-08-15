# Examples

Runnable demos of each feature. They import from `../src` directly, so there is
no build step, but browsers refuse ES modules over `file://`. Serve the repo
root over HTTP from the repo root:

```sh
npm run examples
```

Then open <http://localhost:3000>, which lists every demo.

Demos that play sound need an import map, because the audio module imports
Cacophony by name and there is no bundler to resolve it. See the map at the top
of `reaction.html`. It points at a CDN, so those demos need a network connection
the first time you load them.

## Menu example

A runnable menu with sliders, checkboxes, and text items. Navigate with arrow
keys, adjust values with left and right, confirm with enter, and escape to
leave. The example demonstrates how to build interactive menus with the
`createMenu` API.
