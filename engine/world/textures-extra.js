// engine/world/textures-extra.js
// WHAT: Painters for the bigger block palette added in Kindling 2.1: cobblestone, ores,
//       ice, lava, marble, wool, bookshelves, pumpkins and more (16 x 16 pixel art).
// WHY:  Kept apart from textures.js so each file stays short. Same rules: each painter
//       gets { x, y, size, rand } for one pixel and returns [red, green, blue].
// DOC:  docs/modules/library.md (section "Blocks")
//
// textures.js calls extraPainters(tools) and merges the result into its own list.
// tools = { shade, noise, hash2, painters } so we don't import textures.js (no loops).

export function extraPainters({ shade, noise, hash2, painters }) {
  // Rounded stones with dark gaps: a Voronoi-like pattern from a coarse hash grid.
  function stones(x, y, base, gap, seed) {
    let best = 9;
    let second = 9;
    let id = 0;
    for (let cy = -1; cy <= 1; cy++) {
      for (let cx = -1; cx <= 1; cx++) {
        const gx = Math.floor(x / 5) + cx;
        const gy = Math.floor(y / 5) + cy;
        const px = gx * 5 + hash2(gx & 3, gy & 3, seed) * 5;
        const py = gy * 5 + hash2(gy & 3, gx & 3, seed + 1) * 5;
        const d = Math.hypot(x - px, y - py);
        if (d < best) { second = best; best = d; id = hash2(gx & 3, gy & 3, seed + 2); }
        else if (d < second) second = d;
      }
    }
    if (second - best < 0.9) return gap;
    return shade(base, Math.round((id - 0.5) * 30 - best * 3));
  }
  function wool(color) {
    return ({ x, y, rand }) => shade(color, ((x + y) % 4 === 0 ? -12 : 0) + Math.round((rand - 0.5) * 10));
  }
  function speckled(base, speck, chance) {
    return ({ rand }) => (rand > 1 - chance ? speck : shade(base, Math.round((rand - 0.5) * 16)));
  }

  return {
    cobble: ({ x, y }) => stones(x, y, [132, 132, 136], [70, 70, 76], 11),
    mossy_cobble({ x, y, rand }) {
      const stone = stones(x, y, [126, 132, 124], [66, 72, 64], 11);
      return noise.noise2(x * 0.3, y * 0.3) > 0.1 && rand > 0.35 ? shade([78, 130, 60], Math.round(rand * 20)) : stone;
    },
    gravel: ({ x, y }) => stones(x * 2, y * 2, [140, 128, 120], [96, 88, 84], 23),
    clay: speckled([160, 166, 178], [140, 146, 160], 0.2),
    ice({ x, y, rand }) {
      const crack = (x * 3 + y * 5) % 17 === 0 || (x * 7 - y * 2 + 40) % 23 === 0;
      return crack ? [235, 248, 255] : shade([150, 200, 240], Math.round((rand - 0.5) * 12));
    },
    lava({ x, y, rand }) {
      const flow = noise.noise2(x * 0.3, y * 0.3 + 3);
      if (flow > 0.35) return [255, 236, 120];
      if (flow > 0.05) return [255, 150, 40];
      return shade([200, 60, 20], Math.round(rand * 20));
    },
    gold_ore({ x, y, rand }) {
      const nugget = hash2(x >> 1, y >> 1, 9) > 0.86;
      return nugget ? shade([250, 206, 60], rand > 0.5 ? 20 : -10) : painters.stone({ x, y, rand });
    },
    crystal_block({ x, y, size }) {
      const facet = (x + y) % 8 < 4 ? 30 : -10;
      const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      return edge ? [90, 60, 160] : shade([170, 120, 255], facet + ((x - y + 16) % 6 === 0 ? 50 : 0));
    },
    stone_bricks({ x, y, rand }) {
      const row = Math.floor(y / 8);
      const offset = row % 2 ? 4 : 0;
      if (y % 8 === 7 || (x + offset) % 8 === 7) return [88, 90, 96];
      return shade([140, 142, 148], (y % 8 === 0 ? 14 : 0) + Math.round((rand - 0.5) * 14));
    },
    marble({ x, y, rand }) {
      const vein = Math.abs(noise.noise2(x * 0.25, y * 0.12) + x * 0.04 - 0.3) < 0.05;
      return vein ? [170, 170, 182] : shade([236, 234, 228], Math.round((rand - 0.5) * 8));
    },
    marble_pillar({ x, size, rand }) {
      const groove = x % 4 === 0;
      const edge = x === 0 || x === size - 1;
      return shade([232, 230, 224], (groove ? -40 : 0) + (edge ? -20 : 0) + Math.round((rand - 0.5) * 6));
    },
    obsidian({ x, y, rand }) {
      const glint = hash2(x, y, 31) > 0.95;
      return glint ? [120, 90, 170] : shade([30, 22, 44], Math.round(noise.noise2(x * 0.4, y * 0.4) * 10 + rand * 6));
    },
    cactus_side({ x, y, rand }) {
      const rib = x % 4 === 1;
      const spine = rib && y % 5 === 2;
      if (spine) return [236, 230, 190];
      return shade([70, 140, 60], (rib ? 22 : 0) + Math.round((rand - 0.5) * 10));
    },
    cactus_top({ x, y, size }) {
      const ring = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      return ring > 6 ? [52, 110, 46] : shade([96, 168, 80], ring < 2 ? 18 : 0);
    },
    pumpkin_side({ x, y, rand }) {
      const rib = x % 5 === 0;
      return shade([226, 128, 30], (rib ? -46 : 0) + (y < 2 ? -20 : 0) + Math.round((rand - 0.5) * 12));
    },
    pumpkin_top({ x, y }) {
      if (Math.abs(x - 7.5) < 1.5 && Math.abs(y - 7.5) < 1.5) return [90, 110, 40];
      return shade([214, 116, 26], Math.round(Math.hypot(x - 7.5, y - 7.5)) % 3 === 0 ? -20 : 0);
    },
    bookshelf({ x, y, rand }) {
      if (y % 8 === 0 || y % 8 === 7 || x === 0 || x === 15) return [120, 84, 48];
      const book = Math.floor(x / 2) + Math.floor(y / 8) * 8;
      const colors = [[170, 50, 50], [50, 90, 170], [60, 130, 70], [190, 150, 60], [110, 60, 140], [200, 200, 190]];
      const color = colors[Math.floor(hash2(book, 3) * colors.length)];
      return shade(color, (x % 2 === 0 ? 14 : -10) + (y % 8 === 1 && hash2(book, 5) > 0.5 ? -70 : 0) + Math.round(rand * 6));
    },
    hay_side({ x, y, rand }) {
      if (y % 8 === 3) return [140, 60, 40];
      return shade([222, 186, 70], (x % 3 === 0 ? -24 : 0) + Math.round((rand - 0.5) * 18));
    },
    hay_top: ({ x, y, rand }) => shade([226, 192, 80], ((x * 3 + y) % 5 === 0 ? -30 : 0) + Math.round(rand * 10)),
    dark_planks({ x, y, rand }) {
      if (y % 4 === 3) return [44, 30, 20];
      const seam = (x + Math.floor(y / 4) * 5) % 16 === 0;
      return shade([96, 66, 42], seam ? -30 : Math.round((rand - 0.5) * 14));
    },
    birch_side({ x, y, rand }) {
      const mark = hash2(x >> 2, y, 13) > 0.8 && y % 3 !== 0;
      return mark ? [50, 46, 44] : shade([226, 222, 210], Math.round((rand - 0.5) * 14));
    },
    wool_red: wool([196, 56, 56]),
    wool_blue: wool([52, 86, 196]),
    wool_yellow: wool([238, 200, 56]),
    wool_white: wool([232, 232, 228]),
    wool_green: wool([84, 150, 60]),
    metal({ x, y, size, rand }) {
      const rivet = (x === 2 || x === size - 3) && (y === 2 || y === size - 3);
      const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      if (rivet) return [210, 214, 222];
      return shade([150, 156, 166], (edge ? -36 : 0) + ((x + y) % 7 === 0 ? 10 : 0) + Math.round(rand * 6));
    },
    red_sand: speckled([196, 110, 64], [160, 84, 48], 0.15),
    autumn_leaves({ x, y, rand }) {
      const clump = noise.noise2(x * 0.5 + 9, y * 0.5);
      if (rand > 0.9) return [250, 200, 80];
      return clump < -0.1 || rand < 0.15 ? [170, 70, 30] : [222, 120, 40];
    },
    glow_stone({ x, y, rand }) {
      const cell = hash2(x >> 2, y >> 2, 17);
      return shade([250, 214, 130], Math.round(cell * 40 - 20 + rand * 10));
    },
  };
}
