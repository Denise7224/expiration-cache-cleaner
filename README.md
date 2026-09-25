# Expiration Cache Cleaner

A minimal in-memory key-value cache with per-entry expiration and a `sweep()` method that removes all entries whose lifetime has elapsed.

```js
import { ExpirationCache } from './src/index.js';

const cache = new ExpirationCache();
cache.set('session', { user: 'alice' }, 30_000); // expires in 30 seconds

console.log(cache.get('session')); // { user: 'alice' }

// Later, after the lifetime has passed:
cache.sweep();
console.log(cache.get('session')); // undefined
```

## Why this exists

The cache provides deterministic expiration behaviour without relying on timers or background tasks. Each entry carries an absolute expiration timestamp computed from a clock function supplied to the constructor. The default clock is `Date.now`, but callers can inject a custom clock for testing or simulation.

The main trade-off is that expired entries are not removed automatically. They remain in memory until either `sweep()` is called or the entry is accessed via `get()`. This avoids timer overhead and makes the cache predictable, at the cost of potentially holding expired entries longer than a timer-based implementation would.

## API

`src/index.js` exports one class:

### `ExpirationCache`

- `new ExpirationCache({ clock = Date.now } = {})` — creates a cache. `clock` must be a function returning the current time in milliseconds.
- `set(key, value, ttlMs)` — stores `value` under `key` with a lifetime of `ttlMs` milliseconds. `ttlMs` must be a non-negative finite number. `key` must be a string. Throws `TypeError` for a non-string key and `RangeError` for an invalid TTL.
- `get(key)` — returns the stored value if the entry exists and has not expired, otherwise returns `undefined`. If the entry is expired, it is removed as a side effect.
- `sweep()` — removes every entry whose expiration time is at or before the current clock reading. Returns the number of entries removed.
- `delete(key)` — removes the entry with the given key if present. Returns `true` if an entry was removed, `false` otherwise.
- `clear()` — removes all entries immediately.
- `size` — a read-only number property indicating how many entries are currently stored, including expired entries that have not yet been swept or accessed.

## Edge cases

- An entry with a TTL of `0` expires immediately. `get()` will return `undefined` and remove it.
- Expiration is inclusive: an entry whose expiration time equals the current clock reading is considered expired by both `get()` and `sweep()`.
- The cache stores `undefined` values just like any other value. To distinguish a missing key from a stored `undefined`, use `size` or `delete`.

## Performance

The window keeps a bounded buffer, so `push` is constant time and memory does not
grow with the length of the stream. `peak` and `trough` are linear in the window
size, which is the trade that keeps `push` cheap.

