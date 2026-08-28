# Examples

Runnable demos of each feature supported by this library.
They import from `../src` directly, so there is no build step. However, browsers refuse ES modules over `file://`, so you have to serve the files using NPM in order for these to work.

From the root of the repository:

```sh
npm run examples
```

Then open <http://localhost:3000>, which lists every demo. Click on one, and you're off to the races.

## The multiplayer demo

`net.html` needs a server, which does not run in the browser. Start it in a
second terminal:

```sh
npm run examples:server
```

Then open the page as usual. The server uses `ws`, which is a devDependency, so
it is already installed.
