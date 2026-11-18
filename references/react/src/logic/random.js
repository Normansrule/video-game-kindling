// references/react/src/logic/random.js   (JavaScript twin: engine/math/random.js)
// WHAT: A seeded random number generator (mulberry32). Same seed, same game: tests and
//       replays become repeatable, which Math.random() can't do.
export function createRandom(seed = 1) {
  let state = seed >>> 0;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range: (low, high) => low + (high - low) * next(),
    pick: (list) => list[Math.floor(next() * list.length)],
  };
}
