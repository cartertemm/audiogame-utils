# Examples

Runnable demos of each feature. They import from `../src` directly, so there is
no build step, but browsers refuse ES modules over `file://`. Serve the repo
root over HTTP, from the repo root:

```sh
npm run examples
```

Then open <http://localhost:3000>, which lists every demo.

The path matters as much as the command. Two ways to get a blank page:

- Opening the `.html` file directly. `file:` URLs are unique security origins, so
  the browser blocks the module and logs "Unsafe attempt to load URL".
- Serving this directory instead of the repo root. `../src` then sits outside the
  document root and every import returns 404. The demos live under
  `/examples/`, so `/input.html` is a 404 too.

- `input.html` - speaks every key press, swipe, and tap using the keyboard and
  touch handlers plus speech output. Open it on a phone to check multi-finger
  gestures.
