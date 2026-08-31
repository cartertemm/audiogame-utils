# Math helpers

The `audiogame-utils/math` module provides small calculations that come up often in games. Use these helpers to keep values within limits, calculate progress, translate one numeric scale into another, compare directions, and make random selections.

```js
import { clamp, lerp, range_convert, wrap, random_choice } from 'audiogame-utils/math'

const health = clamp(currentHealth + 25, 0, 100)
const volume = lerp(0, 1, 0.5)
const targetItem = random_choice(['potion', 'shield', 'sword'])
```

You can also import the module as a namespace from the package root:

```js
import { math } from 'audiogame-utils'

const snappedAngle = math.wrap(370, 0, 360)
```

## Range and interpolation

These functions answer related questions about numeric ranges:

* Use `clamp` to keep a value between limits, such as keeping health between 0 and 100.
* Use `lerp` to find a value at a given point between a start and an end, such as fading music halfway from full volume to silence.
* Use `inverse_lerp` to calculate how far a value has progressed through a range, such as turning 25 health out of 100 into a progress value of `0.25`.
* Use `range_convert` to translate a value from one scale to another, such as turning distance into volume.

Interpolation uses a factor commonly named `t`. A factor of `0` means the start, `1` means the end, and `0.5` means halfway between them.

### `clamp(value, min, max)`

Keeps `value` between `min` and `max`, including both limits. Values below `min` become `min`, values above `max` become `max`, and values already inside the range remain unchanged.

```js
clamp(150, 0, 100) // 100
clamp(-10, 0, 100) // 0
clamp(42, 0, 100)  // 42
```

### `lerp(a, b, t)`

Performs linear interpolation between `a` and `b` by factor `t`. When `t = 0`, it returns `a`; when `t = 1`, it returns `b`.

This function does not limit `t` to the range from `0` to `1`. Values outside that range continue past `a` or `b`. Use `clamp(t, 0, 1)` first when the result must stay between the two endpoints.

```js
lerp(0, 100, 0.25) // 25
lerp(10, 20, 0.5)   // 15
```

### `inverse_lerp(a, b, value)`

Calculates the linear interpolation factor `t` for `value` between `a` and `b`. This is useful when you know the current value and need its progress through a range. Returns `0` if `a === b`.

The result can be below `0` or above `1` when `value` is outside the range from `a` to `b`.

```js
inverse_lerp(0, 100, 25) // 0.25
inverse_lerp(10, 20, 15)  // 0.5
```

### `range_convert(value, in_min, in_max, out_min, out_max)`

Maps `value` from an input range `[in_min, in_max]` to an output range `[out_min, out_max]`.

This function does not clamp `value`. A value outside the input range produces a result outside the output range. Clamp the input first when the output must remain within its stated limits.

```js
// Map volume from distance (0 to 50 meters) to audio gain (1.0 to 0.0)
range_convert(25, 0, 50, 1.0, 0.0) // 0.5
```

## Angles and wrapping

Angles repeat after a full turn. These helpers let a game compare headings across the `0` degree boundary or bring an angle back into its expected range.

### `angle_difference(from, to)`

Returns the signed shortest turn from heading `from` to heading `to` in degrees. A positive value indicates turning right (clockwise), a negative value indicates turning left (counterclockwise), and a direct reversal returns `180`.

```js
angle_difference(0, 90)   // 90 (turn right)
angle_difference(90, 0)   // -90 (turn left)
angle_difference(350, 10) // 20
```

### `wrap(value, min, max)`

Wraps `value` into the half-open range `[min, max)`. `min` is included, `max` is excluded, so `wrap(360, 0, 360)` returns `0`.

```js
wrap(365, 0, 360) // 5
wrap(-10, 0, 360) // 350
```

## Randomness

Use these helpers for gameplay choices such as dice rolls, loot selection, or shuffling a deck. The standalone helpers use JavaScript's `Math.random()` and are intended for gameplay variety. Use `random_generator` when a sequence needs to be reproducible. None of these APIs are suitable for security sensitive randomness. Cryptographically secure pseudo random number generators fall outside the scope of this library.

### `random_generator(seed)`

Creates an independent seeded random number generator. The same number or string seed produces the same sequence, which is useful for repeatable levels, simulations, and tests. When `seed` is omitted, `Math.random()` chooses one. The generator reports that value through its `seed` property so the sequence can be recreated later.

```js
const random = random_generator('forest-level-3')

random.next()                // Raw value from 0 inclusive to 1 exclusive
random.int(1, 6)             // Integer from 1 through 6
random.float(5, 10)          // Float from 5 inclusive to 10 exclusive
random.choice(['bow', 'axe'])
random.weighted_choice(['common', 'rare'], [9, 1])
random.shuffle(['north', 'east', 'south', 'west'])
```

Each generator maintains its own sequence. Supplying a seed does not call `Math.random()`.

### `random_int(min, max)`

Returns a random integer between `min` and `max` inclusive.

```js
random_int(1, 6) // Random roll between 1 and 6
```

### `random_float(min = 0, max = 1)`

Returns a random number that can equal `min` but will always be less than `max`. The result usually contains a fractional part.

```js
random_float()       // Float between 0.0 and 1.0
random_float(5, 10)  // Float between 5.0 and 10.0
```

### `random_choice(list)`

Selects a random element from an array. Returns `undefined` if `list` is empty.

```js
random_choice(['apple', 'banana', 'cherry'])
```

### `weighted_choice(list, weights)`

Selects an element from `list` according to an array of relative numeric `weights`. A weight describes how likely its item is compared with the other items. The weights `[80, 19, 1]` give the corresponding items approximately 80 percent, 19 percent, and 1 percent of the selections over many calls.

Provide exactly one finite, nonnegative weight for each item. A weight of `0` prevents that item from being selected. Returns `undefined` if the sum of weights is `<= 0`.

```js
const items = ['common', 'rare', 'legendary']
const weights = [80, 19, 1]

const loot = weighted_choice(items, weights)
```

### `shuffle(list)`

Returns a new array containing the elements of `list` in randomized order. Use it when every item should remain present but their order should vary, such as shuffling cards or encounter order. It does not mutate the original array.

```js
const deck = [1, 2, 3, 4, 5]
const shuffledDeck = shuffle(deck)
```
