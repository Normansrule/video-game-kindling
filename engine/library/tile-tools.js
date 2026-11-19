// engine/library/tile-tools.js
// WHAT: Shared painting helpers for the 2D tile library: lighten/darken, mix two
//       colors, repeatable noise, and pattern makers (bricks, planks, stones, checks).
// WHY:  Most tiles are one of a few patterns in different colors. Writing the pattern
//       once makes a new tile a single line: brickPattern([150, 70, 50], [200, 190, 170]).
// DOC:  docs/modules/library.md (section "Tiles")

import { createNoise, hash2 } from "../math/noise.js";

export const noise = createNoise(41);
export { hash2 };

export function shade(color, amount) {
  return [color[0] + amount, color[1] + amount, color[2] + amount, color[3] ?? 255];
}

export function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 255];
}

// Base color with fine grain: the look of dirt, sand, snow, stone floors.
export function grain(base, amount = 14, speck = null, chance = 0) {
  return (x, y, rand) => (speck && rand > 1 - chance ? speck : shade(base, Math.round((rand - 0.5) * amount)));
}

// Rows of bricks, every other row shifted by half a brick.
export function brickPattern(brick, mortar, width = 8, height = 4, bevel = true) {
  return (x, y, rand) => {
    const row = Math.floor(y / height);
    const offset = row % 2 ? width / 2 : 0;
    if (y % height === height - 1 || (x + offset) % width === width - 1) return mortar;
    const top = bevel && y % height === 0 ? 14 : 0;
    return shade(brick, top + Math.round((rand - 0.5) * 18));
  };
}

// Boards, horizontal (rows) or vertical (columns), with seams.
export function plankPattern(wood, vertical = false, boardSize = 4) {
  return (x, y, rand) => {
    const across = vertical ? x : y;
    const along = vertical ? y : x;
    const board = Math.floor(across / boardSize);
    if (across % boardSize === boardSize - 1) return shade(wood, -46);
    const seam = (along + board * 7) % 16 === 0;
    return shade(wood, (seam ? -34 : 0) + Math.round((rand - 0.5) * 14));
  };
}

// Two-color checkerboard (floors, race lines, dungeon tiles).
export function checkerPattern(a, b, cell = 8, groove = null) {
  return (x, y, rand) => {
    if (groove && (x % cell === 0 || y % cell === 0)) return groove;
    const color = (Math.floor(x / cell) + Math.floor(y / cell)) % 2 ? b : a;
    return shade(color, Math.round((rand - 0.5) * 8));
  };
}

// Rounded stones with dark gaps between them (cobbles, cave walls, gravel).
export function stonePattern(base, gap, cell = 5, seed = 1) {
  return (x, y) => {
    let best = 99;
    let second = 99;
    let id = 0;
    for (let cy = -1; cy <= 1; cy++) {
      for (let cx = -1; cx <= 1; cx++) {
        const gx = Math.floor(x / cell) + cx;
        const gy = Math.floor(y / cell) + cy;
        const wrapX = ((gx % 16) + 16) % 16;
        const wrapY = ((gy % 16) + 16) % 16;
        const px = gx * cell + hash2(wrapX, wrapY, seed) * cell;
        const py = gy * cell + hash2(wrapY, wrapX, seed + 1) * cell;
        const distance = Math.hypot(x - px, y - py);
        if (distance < best) { second = best; best = distance; id = hash2(wrapX, wrapY, seed + 2); }
        else if (distance < second) second = distance;
      }
    }
    if (second - best < 0.9) return gap;
    return shade(base, Math.round((id - 0.5) * 30 - best * 2.5));
  };
}

// Draw a pattern, then put something on top of it where `top` returns a color.
export function layered(bottom, top) {
  return (x, y, rand) => top(x, y, rand) || bottom(x, y, rand);
}
