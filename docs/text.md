# Text helpers

The `audiogame-utils/text` module formats lists, durations, and large numbers for display. It also compares strings and finds the closest candidate for input that may contain a typo.

```js
import {
	prettySequence,
	formatTime,
	prettyNumber,
	stringDistance,
	closestMatch,
} from 'audiogame-utils/text'
```

## Formatting sequences

### `prettySequence(list, last = null)`

Converts the values in an iterable to strings and joins them into a readable sequence. Pass a conjunction such as `and` or `or` as `last` to place it before the final value.

```js
prettySequence(['sword', 'shield', 'potion'], 'and')
// "sword, shield and potion"

prettySequence(['north', 'south'], 'or')
// "north or south"

prettySequence([1, 2, 3])
// "1, 2, 3"
```

The function accepts any iterable, including arrays and sets. It creates a new list of string values and does not modify the original iterable.

Empty and single value inputs do not need separators:

```js
prettySequence([])                          // ""
prettySequence(['inventory'])               // "inventory"
prettySequence(new Set(['a', 'b']), 'and') // "a and b"
```

When `last` is omitted, `null`, or another falsy value, every item is separated by a comma. The function does not add an Oxford comma before a conjunction.

## Formatting durations

### `formatTime(ms, pretty = true)`

Formats a duration in milliseconds using weeks, days, hours, minutes, and seconds. Units with a value of zero are omitted.

```js
formatTime(10_000_000)
// "2 hours, 46 minutes and 40 seconds"

formatTime(69_480_000)
// "19 hours and 18 minutes"

formatTime(61_000)
// "1 minute and 1 second"
```

The default `pretty` mode uses commas between units and `and` before the final unit. Pass `false` to separate every unit with a space:

```js
formatTime(10_000_000, false)
// "2 hours 46 minutes 40 seconds"
```

Durations are rounded down to a whole millisecond, then reported only to the nearest whole second. A duration below one second returns `no time at all`.

```js
formatTime(999)     // "no time at all"
formatTime(1_999.9) // "1 second"
```

Negative values are treated as elapsed durations, so their sign is ignored:

```js
formatTime(-61_000) // "1 minute and 1 second"
```

## Formatting numbers

### `prettyNumber(number, decimals = 2)`

Formats a number with a short scale name. Values below one thousand are rounded to the nearest integer. Larger values are divided by powers of one thousand and use scale names from `thousand` through `vigintillion`.

```js
prettyNumber(999)        // "999"
prettyNumber(12.7)       // "13"
prettyNumber(1_500)      // "1.5 thousand"
prettyNumber(1_271_334_251) // "1.27 billion"
```

The `decimals` argument controls the maximum number of decimal places for scaled values. It defaults to two. Trailing zeros are removed, and passing zero produces a whole number.

```js
prettyNumber(1_271_334_251, 3) // "1.271 billion"
prettyNumber(1_271_334_251, 0) // "1 billion"
prettyNumber(2_000_000, 2)     // "2 million"
```

Rounding can promote a value to the next scale, and negative values keep their sign:

```js
prettyNumber(999_999, 2)  // "1 million"
prettyNumber(999.6)        // "1 thousand"
prettyNumber(-1_500_000)   // "-1.5 million"
```

The function accepts both `Number` and `BigInt` values. A `BigInt` is scaled and rounded using integer arithmetic, so digits beyond the safe integer range are not lost.

```js
prettyNumber(9_007_199_254_740_993n, 6)
// "9.007199 quadrillion"

prettyNumber(123_456_789_012_345_678_901n, 3)
// "123.457 quintillion"
```

`vigintillion` is the largest available scale name. Values beyond it remain expressed in vigintillions:

```js
prettyNumber(10n ** 63n) // "1 vigintillion"
prettyNumber(10n ** 66n) // "1000 vigintillion"
```

## Measuring string distance

### `stringDistance(a, b)`

Returns the number of edits needed to change string `a` into string `b`. An insertion, deletion, substitution, or swap of two adjacent characters counts as one edit.

```js
stringDistance('cat', 'cart')       // 1, insertion
stringDistance('cat', 'cot')        // 1, substitution
stringDistance('form', 'from')      // 1, adjacent swap
stringDistance('kitten', 'sitting') // 3
```

The comparison is case sensitive:

```js
stringDistance('Sword', 'sword') // 1
```

Empty strings have a distance equal to the number of code points in the other string. Strings are split by Unicode code point, which keeps characters such as emoji from being counted as two UTF-16 code units.

```js
stringDistance('', 'sword') // 5
stringDistance('a', '\\u{1F600}') // 1
```

The function expects string arguments. It does not normalize case, accents, or Unicode representations before comparing them.

## Finding the closest match

### `closestMatch(input, candidates, maxDistance = Infinity)`

Finds the candidate with the smallest string distance from `input`. This is useful for matching mistyped commands, menu entries, and other short labels.

```js
const commands = ['inventory', 'interact', 'inspect']

closestMatch('invetnory', commands)
// { match: "inventory", distance: 1 }
```

The comparison is case insensitive. The returned `match` is the original candidate, with its original value and capitalization preserved.

```js
closestMatch('INSPECT', ['Inspect'])
// { match: "Inspect", distance: 0 }
```

Pass `maxDistance` to reject candidates that are too different from the input. A candidate at exactly the maximum distance is accepted.

```js
closestMatch('inspct', commands, 2)
// { match: "inspect", distance: 1 }

closestMatch('zzzzz', commands, 2)
// null
```

The candidates can be any iterable, including an array or set. If the iterable is empty, the function returns `null`. When two candidates have the same distance, the earlier candidate wins.

```js
closestMatch('bat', ['cat', 'rat'])
// { match: "cat", distance: 1 }

closestMatch('inspect', []) // null
```

Both the input and each candidate are converted to strings for comparison. Because the original candidate is returned, candidates do not have to be strings, but their string representations should be meaningful and stable.
