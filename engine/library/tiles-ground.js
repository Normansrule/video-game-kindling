// engine/library/tiles-ground.js
// WHAT: Ground, floor and liquid tiles for the 2D tile library: grass, dirt, sand,
//       snow, roads, wooden and stone floors, carpets, water, lava and more.
// WHY:  The things you walk ON. Every tile is a function (x, y, rand) -> color for one
//       of its 16 x 16 pixels, so it scales, recolors and never needs an image file.
// DOC:  docs/modules/library.md (section "Tiles")

import { shade, mix, grain, plankPattern, checkerPattern, stonePattern, noise, hash2 } from "./tile-tools.js";

const GRASS = [104, 172, 74];
const GRASS_DARK = [72, 136, 58];

function grassPaint(base, dark, light) {
  return (x, y, rand) => {
    const color = rand > 0.84 ? light : rand < 0.22 ? dark : base;
    return shade(color, Math.round(noise.noise2(x * 0.35, y * 0.35) * 9));
  };
}

// Little flowers in groups of 2 x 2 pixels on top of grass.
function flowerPaint(petal) {
  const grass = grassPaint(GRASS, GRASS_DARK, [146, 204, 96]);
  return (x, y, rand) => {
    const spot = hash2(x >> 1, y >> 1, 77);
    if (spot > 0.9) return petal;
    if (spot > 0.88) return [250, 240, 200];
    return grass(x, y, rand);
  };
}

function waterPaint(base, light) {
  return (x, y, rand) => {
    const wave = Math.sin(x * 0.8 + Math.sin(y * 0.5) * 2) > 0.92 && y % 4 === 1;
    return wave ? light : shade(base, Math.round(noise.noise2(x * 0.3, y * 0.3) * 10 + rand * 4));
  };
}

export const groundTiles = [
  // ---- Terrain ----
  { name: "grass", category: "terrain", paint: grassPaint(GRASS, GRASS_DARK, [146, 204, 96]) },
  { name: "grass_dark", category: "terrain", paint: grassPaint([62, 126, 60], [44, 98, 48], [92, 156, 76]) },
  { name: "grass_dry", category: "terrain", paint: grassPaint([168, 170, 84], [138, 140, 64], [196, 196, 110]) },
  { name: "flowers_red", category: "terrain", paint: flowerPaint([226, 70, 82]) },
  { name: "flowers_yellow", category: "terrain", paint: flowerPaint([250, 214, 80]) },
  { name: "flowers_blue", category: "terrain", paint: flowerPaint([110, 140, 240]) },
  { name: "dirt", category: "terrain", paint: grain([136, 98, 68], 18, [104, 72, 50], 0.25) },
  { name: "mud", category: "terrain", paint: (x, y, rand) => shade([96, 74, 56], Math.round(noise.noise2(x * 0.4, y * 0.4) * 14 + (rand > 0.92 ? 18 : 0))) },
  { name: "farmland", category: "terrain", paint: (x, y, rand) => shade(y % 4 === 0 ? [90, 62, 42] : [130, 92, 62], Math.round((rand - 0.5) * 14)) },
  { name: "sand", category: "terrain", paint: grain([228, 208, 154], 16, [200, 178, 126], 0.12) },
  { name: "sand_dark", category: "terrain", paint: grain([196, 170, 116], 16, [170, 146, 98], 0.15) },
  { name: "red_sand", category: "terrain", paint: grain([198, 112, 66], 18, [160, 84, 48], 0.15) },
  { name: "snow", category: "terrain", paint: grain([238, 244, 250], 10, [210, 222, 236], 0.1) },
  { name: "ice", category: "terrain", paint: (x, y, rand) => ((x * 3 + y * 5) % 19 === 0 || (x * 7 - y * 2 + 40) % 23 === 0 ? [240, 250, 255] : shade([158, 206, 238], Math.round((rand - 0.5) * 10))) },
  { name: "gravel", category: "terrain", paint: stonePattern([146, 136, 128], [100, 92, 88], 3, 5) },
  { name: "path", category: "terrain", paint: (x, y, rand) => shade([174, 152, 118], noise.noise2(x * 0.7, y * 0.7) > 0.3 ? 16 : Math.round((rand - 0.5) * 18)) },
  { name: "cobble_road", category: "terrain", paint: stonePattern([150, 146, 140], [84, 80, 76], 5, 9) },
  { name: "moss", category: "terrain", paint: grain([86, 128, 64], 22, [64, 104, 50], 0.3) },
  { name: "swamp", category: "terrain", paint: (x, y, rand) => (noise.noise2(x * 0.3, y * 0.3) > 0.15 ? shade([66, 98, 70], Math.round(rand * 10)) : shade([78, 108, 52], Math.round((rand - 0.5) * 14))) },
  // ---- Floors ----
  { name: "wood_floor", category: "floor", paint: plankPattern([182, 140, 90]) },
  { name: "dark_wood_floor", category: "floor", paint: plankPattern([110, 76, 50]) },
  { name: "stone_floor", category: "floor", paint: checkerPattern([150, 150, 156], [140, 140, 148], 8, [104, 104, 112]) },
  { name: "dungeon_floor", category: "floor", paint: stonePattern([88, 88, 98], [52, 52, 60], 6, 3) },
  { name: "checker_floor", category: "floor", paint: checkerPattern([232, 228, 220], [60, 60, 70], 4) },
  { name: "marble_floor", category: "floor", paint: (x, y, rand) => (x % 8 === 0 || y % 8 === 0 ? [196, 194, 188] : Math.abs(noise.noise2(x * 0.2, y * 0.2) - 0.2) < 0.04 ? [180, 180, 190] : shade([238, 236, 230], Math.round((rand - 0.5) * 6))) },
  { name: "carpet_red", category: "floor", paint: (x, y, rand) => (x <= 1 || x >= 14 ? [216, 170, 60] : shade([170, 40, 50], (x + y) % 4 === 0 ? -14 : Math.round(rand * 6))) },
  { name: "carpet_blue", category: "floor", paint: (x, y, rand) => (x <= 1 || x >= 14 ? [216, 170, 60] : shade([48, 70, 160], (x + y) % 4 === 0 ? -14 : Math.round(rand * 6))) },
  { name: "metal_floor", category: "floor", paint: (x, y, rand) => ((x + y) % 4 === 0 && x % 8 < 6 ? [196, 200, 208] : x % 8 === 7 || y % 8 === 7 ? [90, 94, 104] : shade([146, 150, 160], Math.round(rand * 6))) },
  { name: "tech_floor", category: "floor", paint: (x, y) => (x % 8 === 0 || y % 8 === 0 ? [40, 200, 220] : (x % 8 === 4 && y % 8 === 4) ? [120, 240, 255] : [34, 42, 58]) },
  { name: "tiles_blue", category: "floor", paint: checkerPattern([100, 160, 210], [90, 148, 200], 4, [210, 226, 236]) },
  { name: "hay_floor", category: "floor", paint: (x, y, rand) => shade([224, 190, 80], ((x * 3 + y) % 5 === 0 ? -30 : 0) + Math.round(rand * 10)) },
  // ---- Liquids ----
  { name: "water", category: "liquid", solid: true, paint: waterPaint([52, 124, 200], [150, 210, 250]) },
  { name: "deep_water", category: "liquid", solid: true, paint: waterPaint([30, 76, 150], [90, 150, 220]) },
  { name: "shallow_water", category: "liquid", paint: (x, y, rand) => mix(waterPaint([82, 168, 214], [190, 230, 250])(x, y, rand), [228, 208, 154], hash2(x, y, 4) > 0.8 ? 0.4 : 0.15) },
  { name: "lava", category: "liquid", solid: true, hurts: true, paint: (x, y, rand) => { const flow = noise.noise2(x * 0.3, y * 0.3 + 3); return flow > 0.35 ? [255, 236, 120] : flow > 0.05 ? [255, 150, 40] : shade([200, 60, 20], Math.round(rand * 20)); } },
  { name: "slime_pool", category: "liquid", hurts: true, paint: (x, y, rand) => (hash2(x >> 1, y >> 1, 8) > 0.92 ? [210, 255, 160] : shade([110, 200, 70], Math.round(noise.noise2(x * 0.4, y * 0.4) * 16 + rand * 6))) },
];
