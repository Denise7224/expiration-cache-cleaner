import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExpirationCache } from '../src/core.js';

/**
 * Creates a fake clock whose time can be advanced manually.
 * @param {number} initialMs
 */
function makeFakeClock(initialMs = 0) {
  let now = initialMs;
  return {
    now: () => now,
    advance(ms) {
      now += ms;
      return now;
    },
  };
}

test('stores and retrieves a value before expiration', () => {
  const clock = makeFakeClock(1000);
  const cache = new ExpirationCache({ clock: clock.now });
  cache.set('a', 42, 500);
  assert.equal(cache.get('a'), 42);
});

test('returns undefined for missing key', () => {
  const cache = new ExpirationCache({ clock: makeFakeClock(0).now });
  assert.equal(cache.get('missing'), undefined);
});

test('get returns undefined for expired entry and removes it', () => {
  const clock = makeFakeClock(1000);
  const cache = new ExpirationCache({ clock: clock.now });
  cache.set('a', 'value', 100);
  clock.advance(100);
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.size, 0);
});

test('get returns undefined exactly at expiration boundary', () => {
  const clock = makeFakeClock(1000);
  const cache = new ExpirationCache({ clock: clock.now });
  cache.set('a', 'value', 100);
  clock.advance(100);
  assert.equal(cache.get('a'), undefined);
});

test('sweep removes expired entries and returns count', () => {
  const clock = makeFakeClock(1000);
  const cache = new ExpirationCache({ clock: clock.now });
  cache.set('a', 1, 100);
  cache.set('b', 2, 200);
  cache.set('c', 3, 300);
  clock.advance(200);
  const removed = cache.sweep();
  assert.equal(removed, 2);
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.get('b'), undefined);
  assert.equal(cache.get('c'), 3);
  assert.equal(cache.size, 1);
});

test('sweep removes entries exactly at expiration boundary', () => {
  const clock = makeFakeClock(1000);
  const cache = new ExpirationCache({ clock: clock.now });
  cache.set('a', 1, 100);
  clock.advance(100);
  const removed = cache.sweep();
  assert.equal(removed, 1);
  assert.equal(cache.size, 0);
});

test('sweep with no expired entries returns zero', () => {
  const clock = makeFakeClock(1000);
  const cache = new ExpirationCache({ clock: clock.now });
  cache.set('a', 1, 500);
  cache.set('b', 2, 600);
  const removed = cache.sweep();
  assert.equal(removed, 0);
  assert.equal(cache.size, 2);
});

test('set overwrites existing key and resets expiration', () => {
  const clock = makeFakeClock(1000);
  const cache = new ExpirationCache({ clock: clock.now });
  cache.set('a', 'first', 100);
  clock.advance(50);
  cache.set('a', 'second', 100);
  clock.advance(75);
  assert.equal(cache.get('a'), 'second');
  clock.advance(25);
  assert.equal(cache.get('a'), undefined);
});

test('set with zero ttl expires immediately', () => {
  const clock = makeFakeClock(1000);
  const cache = new ExpirationCache({ clock: clock.now });
  cache.set('a', 'value', 0);
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.size, 0);
});

test('set rejects negative ttl', () => {
  const cache = new ExpirationCache({ clock: makeFakeClock(0).now });
  assert.throws(() => cache.set('a', 1, -1), RangeError);
});

test('set rejects non-finite ttl', () => {
  const cache = new ExpirationCache({ clock: makeFakeClock(0).now });
  assert.throws(() => cache.set('a', 1, Number.NaN), RangeError);
  assert.throws(() => cache.set('a', 1, Number.POSITIVE_INFINITY), RangeError);
});

test('set rejects non-string key', () => {
  const cache = new ExpirationCache({ clock: makeFakeClock(0).now });
  assert.throws(() => cache.set(123, 'value', 100), TypeError);
});

test('delete removes entry and returns true when present', () => {
  const cache = new ExpirationCache({ clock: makeFakeClock(0).now });
  cache.set('a', 'value', 100);
  assert.equal(cache.delete('a'), true);
  assert.equal(cache.size, 0);
  assert.equal(cache.get('a'), undefined);
});

test('delete returns false for missing key', () => {
  const cache = new ExpirationCache({ clock: makeFakeClock(0).now });
  assert.equal(cache.delete('missing'), false);
});

test('clear removes all entries', () => {
  const clock = makeFakeClock(1000);
  const cache = new ExpirationCache({ clock: clock.now });
  cache.set('a', 1, 100);
  cache.set('b', 2, 200);
  cache.clear();
  assert.equal(cache.size, 0);
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.get('b'), undefined);
});

test('size includes expired entries not yet swept or accessed', () => {
  const clock = makeFakeClock(1000);
  const cache = new ExpirationCache({ clock: clock.now });
  cache.set('a', 1, 100);
  cache.set('b', 2, 200);
  clock.advance(150);
  assert.equal(cache.size, 2);
  cache.sweep();
  assert.equal(cache.size, 1);
});

test('cache can store and retrieve falsy values', () => {
  const clock = makeFakeClock(1000);
  const cache = new ExpirationCache({ clock: clock.now });
  cache.set('zero', 0, 100);
  cache.set('empty', '', 100);
  cache.set('false', false, 100);
  cache.set('null', null, 100);
  assert.equal(cache.get('zero'), 0);
  assert.equal(cache.get('empty'), '');
  assert.equal(cache.get('false'), false);
  assert.equal(cache.get('null'), null);
});
