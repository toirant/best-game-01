/**
 * rng.js — a small seeded random number generator (mulberry32) plus helpers.
 * The game uses Math.random for live play and a seeded instance for its
 * deterministic screenshot stages, so a shot renders the same frame every time.
 */

/** A seeded RNG: returns a function producing floats in [0, 1). */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float in [min, max) from a rng function. */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

/** An integer in [min, max] from a rng function. */
export function rangeInt(rng, min, max) {
  return Math.floor(range(rng, min, max + 1));
}

/** Pick one element of an array with a rng function. */
export function pick(rng, array) {
  return array[Math.floor(rng() * array.length)];
}

/** Shuffle a copy of an array in place with a rng function (Fisher-Yates). */
export function shuffle(rng, array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
  return array;
}
