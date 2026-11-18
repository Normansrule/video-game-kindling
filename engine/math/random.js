// engine/math/random.js
// WHAT: A seeded random number generator with game-friendly helpers.
// WHY:  Math.random() can't be repeated. With a seed, the same level, the same
//       enemy waves and the same bug come back every time you run the game.
//       Algorithm: mulberry32, a tiny, fast 32-bit generator (good for games, not for passwords).
// DOC:  docs/modules/math.md

export function createRandom(seed = Date.now()) {
  // Keep the state as a 32-bit unsigned integer.
  let state = seed >>> 0;

  // Returns a number in [0, 1), like Math.random().
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed = mixed ^ (mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61));
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  }

  // A decimal number in [min, max).
  function range(min, max) {
    return min + next() * (max - min);
  }

  // A whole number from min to max, INCLUDING max. int(1, 6) is a die roll.
  function int(min, max) {
    return min + Math.floor(next() * (max - min + 1));
  }

  // True with the given probability. chance(0.25) is true about 1 time in 4.
  function chance(probability) {
    return next() < probability;
  }

  // A random item from an array.
  function pick(items) {
    return items[Math.floor(next() * items.length)];
  }

  // -1 or +1.
  function sign() {
    return next() < 0.5 ? -1 : 1;
  }

  // A shuffled COPY of an array (Fisher-Yates shuffle).
  function shuffle(items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      const temporary = result[i];
      result[i] = result[j];
      result[j] = temporary;
    }
    return result;
  }

  // Pick from { name: weight } so heavier names come up more often.
  function weighted(weights) {
    let total = 0;
    for (const name in weights) total = total + weights[name];
    let roll = next() * total;
    for (const name in weights) {
      roll = roll - weights[name];
      if (roll < 0) return name;
    }
    return Object.keys(weights)[0];
  }

  return { next, range, int, chance, pick, sign, shuffle, weighted };
}

// A ready-made generator for when you don't care about the seed.
export const random = createRandom();
