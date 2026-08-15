# Focus

The `audiogame-utils/focus` module exports a focus trap for gameplay screens. It gives the game every keypress by placing the screen reader in application mode and keeps keyboard focus inside the game container.

Release the trap before showing a menu or another screen that should use normal browser and screen reader navigation.

```js
import { createFocusTrap } from 'audiogame-utils/focus'

const game = document.querySelector('#game')
const focusTrap = createFocusTrap(game, { label: 'Asteroid field' })

// When gameplay ends or a menu opens:
focusTrap.release()
```

## `createFocusTrap(node, options)`

Creates a focus trap around `node` and focuses it immediately. The function adds `role="application"` and `tabindex="-1"` when those attributes are not already present.

While the trap is active:

1. Moving focus outside `node` returns focus to it.
2. Tab and Shift+Tab cycle through links, buttons, inputs, selects, text areas, and elements with a `tabindex` attribute.
3. Disabled elements, elements with the `hidden` attribute, and elements with `tabindex="-1"` are skipped.
4. If there are no tabbable descendants, Tab keeps focus on `node`.

### Options

`label` sets `aria-label` on `node` when it does not already have one. Use a short label that identifies the gameplay area.

`restoreFocus` controls whether `release()` returns focus to the element that was focused before the trap was created. It defaults to `true`.

```js
const focusTrap = createFocusTrap(game, {
	label: 'Race track',
	restoreFocus: false,
})
```

## `release()`

Stops trapping focus and removes the attributes that `createFocusTrap()` added. Attributes that were already present are preserved. By default, focus returns to the element that was active when the trap was created.

Calling `release()` more than once has no additional effect.
