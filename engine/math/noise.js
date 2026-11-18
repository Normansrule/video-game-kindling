// engine/math/noise.js
// WHAT: Smooth random numbers ("value noise") in 2D and 3D, plus fractal noise (fbm)
//       that stacks several layers of it. Same seed, same landscape, every time.
// WHY:  Math.random() gives static: every pixel unrelated to its neighbor. Terrain,
//       clouds, wobbly textures and wind need randomness that changes SLOWLY across
//       space. Value noise does it in the plainest way: random values on a grid of
//       whole numbers, and smooth blending in between.
// DOC:  docs/modules/world.md (section "Noise")   VIZ: viz/14-world-modes/
//
// Usage:
//   import { createNoise } from "kindling/math/noise.js";
//   const noise = createNoise(42);
//   const height = noise.fbm2(x * 0.05, z * 0.05, 4);   // about -1..1

// Smoothstep-like curve (6t^5 - 15t^4 + 10t^3): eases in AND out, so the
// blend between grid points has no visible creases.
function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

export function createNoise(seed = 1) {
  // A shuffled table of 0..255 decides the random value at each grid point.
  // Doubling it to 512 entries means table[index + 1] never runs off the end.
  const table = new Uint8Array(512);
  const order = [];
  for (let i = 0; i < 256; i++) order.push(i);
  // Fisher-Yates shuffle with a tiny seeded generator (same idea as math/random.js).
  let state = seed >>> 0;
  function nextRandom() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(nextRandom() * (i + 1));
    const temporary = order[i];
    order[i] = order[j];
    order[j] = temporary;
  }
  for (let i = 0; i < 512; i++) table[i] = order[i & 255];

  // The random value (-1..1) stored at whole-number grid point (x, y, z).
  function gridValue(x, y, z) {
    const index = table[table[table[x & 255] + (y & 255)] + (z & 255)];
    return index / 127.5 - 1;
  }

  // 3D value noise: find the 8 grid corners around the point, blend their values.
  function noise3(x, y, z) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const z0 = Math.floor(z);
    const tx = fade(x - x0);
    const ty = fade(y - y0);
    const tz = fade(z - z0);
    // Blend along x on the 4 edges, then along y, then along z.
    const bottomFront = mix(gridValue(x0, y0, z0), gridValue(x0 + 1, y0, z0), tx);
    const topFront = mix(gridValue(x0, y0 + 1, z0), gridValue(x0 + 1, y0 + 1, z0), tx);
    const bottomBack = mix(gridValue(x0, y0, z0 + 1), gridValue(x0 + 1, y0, z0 + 1), tx);
    const topBack = mix(gridValue(x0, y0 + 1, z0 + 1), gridValue(x0 + 1, y0 + 1, z0 + 1), tx);
    const front = mix(bottomFront, topFront, ty);
    const back = mix(bottomBack, topBack, ty);
    return mix(front, back, tz);
  }

  // 2D is just 3D noise on the z = 0 slice.
  function noise2(x, y) {
    return noise3(x, y, 0);
  }

  // Fractal Brownian motion: add "octaves" of noise, each twice as detailed and
  // half as strong as the last. Big hills from octave 1, bumps from octave 4.
  function fbm3(x, y, z, octaves = 4) {
    let total = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxTotal = 0;
    for (let octave = 0; octave < octaves; octave++) {
      total = total + noise3(x * frequency, y * frequency, z * frequency) * amplitude;
      maxTotal = maxTotal + amplitude;
      amplitude = amplitude * 0.5;
      frequency = frequency * 2;
    }
    return total / maxTotal;   // back into -1..1
  }

  function fbm2(x, y, octaves = 4) {
    return fbm3(x, y, 0.5, octaves);
  }

  return { noise2, noise3, fbm2, fbm3 };
}

// Cheap per-pixel or per-block "hash": a repeatable pseudo-random 0..1 for whole numbers.
// Use it for texture speckles and tree placement, where smoothness doesn't matter.
export function hash2(x, y, seed = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
