# Examples

Runnable demos of each feature supported by this library.
They import from `../src` directly, so there is no build step. However, browsers refuse ES modules over `file://`, so you have to serve the files using NPM in order for these to work.

From the root of the repository:

```sh
npm run examples
```

Then open <http://localhost:3000>, which lists every demo. Click on one, and you're off to the races.

## Network chat

The network chat also needs its WebSocket server. Keep `npm run examples` running, then open a second terminal in the repository root and run:

```sh
npm run example:net-chat
```

Open <http://localhost:3000/examples/net-chat.html> in two browser tabs. Enter a different name in each tab to send messages and try the connection events.
