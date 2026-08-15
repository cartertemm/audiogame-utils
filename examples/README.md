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

## Riverside venue example

`walk.html` with the world moved out of the code and into `maps/venue.json`. The
map is 20 by 40: a parking lot from y 0 to 20 and a concert hall from y 21 to
40.

It shows what the map module is for:

- A `tile` entry per half, read at every step, so footsteps go from concrete to
  wood at the doorway.
- A `zone` entry per half, read at every step, so the name is spoken when you
  cross.
- A `src` entry per looping sound. The example places each one at the middle of
  its box and turns the box into the sound pool range, so the truck is a point
  and the stage is as wide as the stage.

## Menu example

A main menu and an options submenu, built from text items, sliders, and a
checkbox. Navigate with arrow keys, adjust values with left and right, confirm
with enter, and escape to leave.

It shows the parts a game menu usually needs:

- Menu sounds from `sounds/menu/`, set once and shared by both menus.
- Looping music that the game owns, started on open and toggled by a checkbox.
- A submenu, opened after the parent menu closes so only one focus trap is live.
- `speak` and `speakValue` on a slider, so arrow presses do not repeat the label.
- A disabled item and a label change that happen while the menu is open.
