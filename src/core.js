/**
 * A key-value cache with per-entry expiration times.
 *
 * The cache accepts a `clock` function so callers can supply a deterministic
 * time source in tests. The clock must return a number representing the
 * current time in milliseconds. All entry lifetimes are also specified in
 * milliseconds.
 */
export class ExpirationCache {
  /**
   * @param {Object} [options]
   * @param {() => number} [options.clock] Time source returning milliseconds.
   *   Defaults to `Date.now`.
   */
  constructor({ clock = Date.now } = {}) {
    /** @type {() => number} */
    this._clock = clock;
    /** @type {Map<string, { value: unknown, expiresAt: number }>} */
    this._entries = new Map();
  }

  /**
   * Store a value with a lifetime.
   *
   * @param {string} key
   * @param {unknown} value
   * @param {number} ttlMs Lifetime in milliseconds. Must be a non-negative
   *   finite number.
   */
  set(key, value, ttlMs) {
    if (typeof key !== 'string') {
      throw new TypeError('key must be a string');
    }
    if (!Number.isFinite(ttlMs) || ttlMs < 0) {
      throw new RangeError('ttlMs must be a non-negative finite number');
    }
    const now = this._clock();
    this._entries.set(key, { value, expiresAt: now + ttlMs });
  }

  /**
   * Retrieve a value if it has not expired.
   *
   * Expired entries are removed as a side effect of the lookup.
   *
   * @param {string} key
   * @returns {unknown} The stored value, or `undefined` if missing or expired.
   */
  get(key) {
    const entry = this._entries.get(key);
    if (!entry) {
      return undefined;
    }
    const now = this._clock();
    if (entry.expiresAt <= now) {
      this._entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Remove all entries whose expiration time is at or before the current
   * clock reading.
   *
   * @returns {number} The number of entries removed.
   */
  sweep() {
    const now = this._clock();
    let removed = 0;
    for (const [key, entry] of this._entries) {
      if (entry.expiresAt <= now) {
        this._entries.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  /**
   * Number of entries currently held, including expired entries that have not
   * yet been swept or accessed.
   *
   * @returns {number}
   */
  get size() {
    return this._entries.size;
  }

  /**
   * Remove a single entry if present.
   *
   * @param {string} key
   * @returns {boolean} True if an entry was removed.
   */
  delete(key) {
    return this._entries.delete(key);
  }

  /**
   * Remove all entries immediately.
   */
  clear() {
    this._entries.clear();
  }
}
