// engine/library/tiles-walls.js
// WHAT: Wall, roof and platform tiles for the 2D tile library: bricks, castle stone,
//       caves, hedges, metal, glass, platforms you stand on and ones you jump through.
// WHY:  The things that block you. They are solid by default; "oneWay" tiles only
//       block from above, like the wooden platforms in most platformers.
// DOC:  docs/modules/library.md (section "Tiles")

import { shade, grain, brickPattern, plankPattern, stonePattern, noise, hash2 } from "./tile-tools.js";

// A platform: a colored top band over a body pattern (grass over dirt, snow over stone).
function topped(topColor, topDepth, body) {
  return (x, y, rand) => {
    const fringe = topDepth + Math.floor(hash2(x, 99) * 2);
    if (y < fringe) return shade(topColor, y === fringe - 1 ? -24 : Math.round((rand - 0.5) * 12));
    return body(x, y, rand);
  };
}

// A box with a lighter top-left edge and darker bottom-right edge (a "bevel").
function bevelBox(face, edge = 2) {
  return (x, y, rand) => {
    if (x < edge || y < edge) return shade(face, 40);
    if (x > 15 - edge || y > 15 - edge) return shade(face, -50);
    return shade(face, Math.round((rand - 0.5) * 8));
  };
}

const dirt = grain([136, 98, 68], 18, [104, 72, 50], 0.25);
const stone = stonePattern([130, 130, 138], [76, 76, 84], 5, 21);

export const wallTiles = [
  // ---- Walls ----
  { name: "brick_wall", category: "wall", solid: true, paint: brickPattern([168, 74, 58], [204, 194, 178]) },
  { name: "dark_brick_wall", category: "wall", solid: true, paint: brickPattern([100, 54, 50], [60, 44, 44]) },
  { name: "stone_wall", category: "wall", solid: true, paint: brickPattern([140, 142, 150], [86, 88, 96], 8, 8) },
  { name: "castle_wall", category: "wall", solid: true, paint: brickPattern([176, 168, 150], [110, 104, 92], 8, 5) },
  { name: "sandstone_wall", category: "wall", solid: true, paint: brickPattern([222, 196, 140], [176, 148, 98], 16, 4) },
  { name: "dungeon_wall", category: "wall", solid: true, paint: brickPattern([74, 76, 92], [36, 36, 46], 8, 6) },
  { name: "cave_wall", category: "wall", solid: true, paint: stonePattern([108, 96, 88], [56, 48, 44], 6, 13) },
  { name: "stone_block", category: "wall", solid: true, paint: stone },
  { name: "mossy_stone", category: "wall", solid: true, paint: (x, y, rand) => (noise.noise2(x * 0.3, y * 0.3) > 0.15 && rand > 0.3 ? shade([82, 132, 62], Math.round(rand * 16)) : stone(x, y, rand)) },
  { name: "wood_wall", category: "wall", solid: true, paint: plankPattern([160, 118, 72], true) },
  { name: "log_wall", category: "wall", solid: true, paint: (x, y, rand) => (y % 5 === 4 ? [70, 48, 30] : shade([128, 90, 56], (y % 5 === 0 ? 18 : 0) + (x % 9 === 0 ? -20 : 0) + Math.round((rand - 0.5) * 12))) },
  { name: "hedge", category: "wall", solid: true, paint: (x, y, rand) => (rand > 0.88 ? [120, 190, 90] : shade(noise.noise2(x * 0.5, y * 0.5) < -0.1 ? [40, 100, 50] : [58, 132, 62], Math.round((rand - 0.5) * 10))) },
  { name: "metal_wall", category: "wall", solid: true, paint: (x, y, rand) => ((x === 2 || x === 13) && (y === 2 || y === 13) ? [220, 224, 232] : x === 0 || y === 0 ? [180, 184, 194] : x === 15 || y === 15 ? [70, 74, 84] : shade([128, 134, 146], Math.round(rand * 8))) },
  { name: "tech_wall", category: "wall", solid: true, paint: (x, y) => (y === 7 || y === 8 ? ((x >> 1) % 2 ? [255, 90, 120] : [60, 230, 255]) : x === 0 || y === 0 ? [90, 100, 124] : x === 15 || y === 15 ? [24, 28, 40] : [56, 64, 84]) },
  { name: "ice_wall", category: "wall", solid: true, paint: bevelBox([150, 204, 240], 1) },
  { name: "glass", category: "wall", solid: true, paint: (x, y) => (x === 0 || y === 0 || x === 15 || y === 15 ? [200, 220, 236] : (x - y === 3 || x - y === 5) ? [236, 246, 255] : [140, 190, 220, 110]) },
  { name: "crystal_wall", category: "wall", solid: true, paint: (x, y) => shade([168, 120, 250], ((x + y) % 8 < 4 ? 26 : -14) + ((x - y + 16) % 6 === 0 ? 50 : 0)) },
  // ---- Roofs ----
  { name: "roof_red", category: "roof", solid: true, paint: (x, y, rand) => shade([180, 64, 58], (y % 4 === 3 || (y % 4 === 2 && (x + (y >> 2) * 2) % 4 === 0) ? -50 : 0) + Math.round((rand - 0.5) * 12)) },
  { name: "roof_blue", category: "roof", solid: true, paint: (x, y, rand) => shade([60, 92, 170], (y % 4 === 3 || (y % 4 === 2 && (x + (y >> 2) * 2) % 4 === 0) ? -40 : 0) + Math.round((rand - 0.5) * 12)) },
  { name: "thatch_roof", category: "roof", solid: true, paint: (x, y, rand) => shade([206, 170, 82], (y % 5 === 4 ? -46 : 0) + ((x * 2 + y) % 3 === 0 ? -16 : 0) + Math.round(rand * 8)) },
  // ---- Platforms (stand on them) ----
  { name: "grass_block", category: "platform", solid: true, paint: topped([104, 172, 74], 4, dirt) },
  { name: "snow_block", category: "platform", solid: true, paint: topped([238, 244, 250], 4, stone) },
  { name: "sand_block", category: "platform", solid: true, paint: topped([236, 216, 160], 3, grain([206, 180, 126], 16)) },
  { name: "dirt_block", category: "platform", solid: true, paint: dirt },
  { name: "brick_block", category: "platform", solid: true, paint: bevelBox([186, 92, 60]) },
  { name: "gold_block", category: "platform", solid: true, paint: (x, y, rand) => { const mark = (x >= 6 && x <= 9 && (y === 4 || y === 5)) || (x >= 8 && x <= 9 && y >= 5 && y <= 8) || (x >= 7 && x <= 8 && (y === 10 || y === 11)); return mark ? [120, 70, 20] : bevelBox([236, 170, 50])(x, y, rand); } },
  { name: "wood_platform", category: "platform", solid: true, oneWay: true, paint: (x, y, rand) => (y < 5 ? (y === 4 ? [92, 60, 34] : shade([186, 136, 80], (x % 8 === 0 ? -30 : 0) + Math.round(rand * 10))) : null) },
  { name: "stone_ledge", category: "platform", solid: true, oneWay: true, paint: (x, y, rand) => (y < 6 ? (y === 5 ? [70, 70, 78] : shade([150, 150, 158], Math.round((rand - 0.5) * 18))) : null) },
  { name: "cloud", category: "platform", solid: true, oneWay: true, paint: (x, y) => { const d = Math.min(Math.hypot((x - 4) / 1.2, y - 8), Math.hypot((x - 11) / 1.2, y - 7), Math.hypot((x - 8) / 1.6, y - 5)); return d < 4.2 ? (y > 9 ? [214, 226, 240] : [255, 255, 255]) : null; } },
  { name: "bridge", category: "platform", solid: true, oneWay: true, paint: (x, y, rand) => (y === 1 ? [90, 64, 40] : y >= 3 && y < 8 ? (x % 4 === 3 ? [86, 58, 34] : shade([170, 122, 72], Math.round(rand * 10))) : null) },
];
