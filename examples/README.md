# Examples

Runnable demos of each feature. They import from `../src` directly, so there is
no build step, but browsers refuse ES modules over `file://`. Serve the repo
root over HTTP from the repo root:

```sh
npm run examples
```

Then open <http://localhost:3000>, which lists every demo.
