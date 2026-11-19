// engine/library/tiles-props.js
// WHAT: Object and decoration tiles for the 2D tile library: crates, barrels, chests,
//       doors, ladders, signs, torches, fences, spikes, trees, rocks, furniture and a
//       goal flag. Most have see-through pixels so they sit on any ground tile.
// WHY:  Shapes are drawn with a little geometry (is this pixel inside the circle?),
//       which is how you can make your own: copy one and change the numbers.
// DOC:  docs/modules/library.md (section "Tiles")

import { shade, hash2 } from "./tile-tools.js";

const WOOD = [170, 120, 70];
const WOOD_DARK = [96, 62, 36];
const IRON = [80, 84, 96];

const inEllipse = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
const lit = (color, x, y, cx, cy) => shade(color, Math.round(((cx - x) + (cy - y)) * 3));   // light from the top-left

export const propTiles = [
  { name: "crate", category: "object", solid: true, paint: (x, y, rand) => {
    if (x < 2 || y < 2 || x > 13 || y > 13) return x === 0 || y === 0 || x === 15 || y === 15 ? WOOD_DARK : shade(WOOD, -24);
    if (Math.abs(x - y) < 1.5 || Math.abs(x + y - 15) < 1.5) return shade(WOOD, -30);
    return shade(WOOD, Math.round((rand - 0.5) * 16) + (y % 4 === 0 ? -10 : 0));
  } },
  { name: "barrel", category: "object", solid: true, paint: (x, y, rand) => {
    if (!inEllipse(x, y, 8, 8, 6.5 - Math.abs(y - 7.5) * 0.12, 7.6)) return null;
    if (y === 3 || y === 12) return IRON;
    return lit(shade(WOOD, x % 3 === 0 ? -26 : Math.round((rand - 0.5) * 10)), x, y, 6, 6);
  } },
  { name: "chest", category: "object", solid: true, paint: (x, y) => {
    if (y < 3 || x < 1 || x > 14 || y > 14) return null;
    if (x === 1 || x === 14 || y === 3 || y === 14) return WOOD_DARK;
    if (y === 7) return [210, 170, 60];
    if (x >= 7 && x <= 8 && y >= 7 && y <= 9) return [240, 210, 90];
    return shade([150, 90, 46], y < 7 ? 16 : 0);
  } },
  { name: "chest_open", category: "object", solid: true, paint: (x, y) => {
    if (x < 1 || x > 14 || y > 14) return null;
    if (y < 5) return y === 0 || x === 1 || x === 14 ? WOOD_DARK : [176, 110, 56];
    if (y < 8) return hash2(x, y, 3) > 0.4 ? [255, 214, 80] : [240, 180, 40];
    if (x === 1 || x === 14 || y === 14) return WOOD_DARK;
    return [150, 90, 46];
  } },
  { name: "door", category: "object", solid: true, door: true, paint: (x, y, rand) => {
    if (!inEllipse(x, y, 8, 8, 7, 11) || y < 1) return null;
    if (x === 11 && y === 9) return [230, 200, 90];
    return shade([136, 86, 46], (x % 4 === 0 ? -30 : 0) + Math.round((rand - 0.5) * 10));
  } },
  { name: "door_locked", category: "object", solid: true, door: true, paint: (x, y, rand) => {
    if (!inEllipse(x, y, 8, 8, 7, 11) || y < 1) return null;
    if (x >= 6 && x <= 9 && y >= 7 && y <= 11) return y === 7 || x === 6 || x === 9 ? [140, 110, 30] : [236, 200, 70];
    if (y === 4 || y === 12) return IRON;
    return shade([110, 66, 36], (x % 4 === 0 ? -26 : 0) + Math.round((rand - 0.5) * 10));
  } },
  { name: "ladder", category: "object", climb: true, paint: (x, y) => (x === 3 || x === 12 ? WOOD_DARK : x > 3 && x < 12 && y % 4 === 1 ? WOOD : null) },
  { name: "sign", category: "object", solid: true, paint: (x, y) => {
    if (x >= 7 && x <= 8 && y >= 9) return WOOD_DARK;
    if (x >= 1 && x <= 14 && y >= 2 && y <= 9) return x === 1 || x === 14 || y === 2 || y === 9 ? WOOD_DARK : (y === 4 || y === 6) && x > 3 && x < 12 && x % 3 ? [90, 60, 40] : [196, 150, 96];
    return null;
  } },
  { name: "torch", category: "object", light: true, paint: (x, y) => {
    if (x >= 7 && x <= 8 && y >= 7 && y <= 14) return WOOD_DARK;
    if (inEllipse(x, y, 8, 5, 2.5, 3.5)) return y > 5 ? [255, 140, 40] : [255, 236, 140];
    return null;
  } },
  { name: "fence", category: "object", solid: true, paint: (x, y) => ((x === 2 || x === 3 || x === 12 || x === 13) && y >= 3 ? (x % 2 ? WOOD_DARK : WOOD) : (y === 6 || y === 7 || y === 11 || y === 12) ? (y % 2 ? WOOD_DARK : WOOD) : null) },
  { name: "spikes", category: "hazard", hurts: true, paint: (x, y) => {
    const local = x % 5;
    const height = 10 - Math.abs(local - 2) * 4;
    if (y >= 14) return [70, 70, 80];
    if (y >= 14 - height) return local < 2 ? [220, 224, 232] : [150, 154, 166];
    return null;
  } },
  { name: "bush", category: "nature", solid: true, paint: (x, y, rand) => (inEllipse(x, y, 8, 9, 7.5, 6.5) ? (rand > 0.85 ? [120, 196, 90] : lit([62, 140, 64], x, y, 6, 6)) : null) },
  { name: "berry_bush", category: "nature", solid: true, paint: (x, y, rand) => (inEllipse(x, y, 8, 9, 7.5, 6.5) ? (hash2(x >> 1, y >> 1, 2) > 0.86 ? [220, 50, 80] : lit([62, 140, 64], x, y, 6, 6)) : null) },
  { name: "rock", category: "nature", solid: true, paint: (x, y, rand) => (inEllipse(x, y, 8, 10, 7, 5.5) ? lit(shade([140, 140, 148], Math.round((rand - 0.5) * 14)), x, y, 6, 8) : null) },
  { name: "tree", category: "nature", solid: true, paint: (x, y, rand) => {
    if (x >= 7 && x <= 8 && y >= 11) return [110, 74, 44];
    if (inEllipse(x, y, 8, 6.5, 7.5, 6.5)) return rand > 0.86 ? [130, 200, 100] : lit([56, 136, 60], x, y, 5, 4);
    return null;
  } },
  { name: "pine", category: "nature", solid: true, paint: (x, y) => {
    if (x >= 7 && x <= 8 && y >= 13) return [110, 74, 44];
    const half = (y % 5 + 1 + Math.floor(y / 5) * 1.6);
    if (y < 13 && Math.abs(x + 0.5 - 8) <= half) return x < 8 ? [52, 120, 74] : [36, 92, 58];
    return null;
  } },
  { name: "autumn_tree", category: "nature", solid: true, paint: (x, y, rand) => {
    if (x >= 7 && x <= 8 && y >= 11) return [110, 74, 44];
    if (inEllipse(x, y, 8, 6.5, 7.5, 6.5)) return rand > 0.85 ? [250, 200, 80] : lit([214, 110, 40], x, y, 5, 4);
    return null;
  } },
  { name: "stump", category: "nature", solid: true, paint: (x, y) => (x >= 3 && x <= 12 && y >= 8 && y <= 14 ? (y <= 9 ? (Math.round(Math.abs(x - 7.5)) % 2 ? [200, 160, 100] : [176, 136, 84]) : x % 3 === 0 ? WOOD_DARK : [128, 88, 52]) : null) },
  { name: "mushroom", category: "nature", paint: (x, y) => {
    if (x >= 6 && x <= 9 && y >= 9 && y <= 14) return [240, 232, 216];
    if (inEllipse(x, y, 8, 8, 6.5, 4) && y <= 9) return (x === 5 && y === 6) || (x === 10 && y === 7) || (x === 8 && y === 5) ? [255, 255, 255] : [210, 50, 50];
    return null;
  } },
  { name: "tall_grass", category: "nature", paint: (x, y) => { const blade = (x * 7) % 5; return y > 6 + blade && x % 2 === 0 ? (blade > 2 ? [86, 160, 66] : [120, 190, 80]) : null; } },
  { name: "cactus", category: "nature", solid: true, hurts: true, paint: (x, y) => {
    const trunk = x >= 6 && x <= 9 && y >= 1;
    const arms = (x >= 2 && x <= 3 && y >= 4 && y <= 9) || (x >= 12 && x <= 13 && y >= 2 && y <= 7) || (y >= 8 && y <= 9 && x >= 2 && x <= 6) || (y >= 6 && y <= 7 && x >= 9 && x <= 13);
    if (!trunk && !arms) return null;
    return hash2(x, y, 12) > 0.9 ? [236, 230, 190] : x % 3 === 0 ? [50, 112, 50] : [80, 150, 64];
  } },
  { name: "pot", category: "object", solid: true, paint: (x, y) => (y >= 3 && inEllipse(x, y, 8, 9.5, 6 - (y < 6 ? 2 : 0), 6.5) ? (y === 3 || y === 4 ? [120, 60, 40] : lit([190, 100, 60], x, y, 6, 7)) : null) },
  { name: "bookshelf", category: "object", solid: true, paint: (x, y, rand) => {
    if (y % 8 === 0 || y % 8 === 7 || x === 0 || x === 15) return WOOD_DARK;
    const book = Math.floor(x / 2) + Math.floor(y / 8) * 8;
    const colors = [[170, 50, 50], [50, 90, 170], [60, 130, 70], [190, 150, 60], [110, 60, 140]];
    return shade(colors[Math.floor(hash2(book, 3) * colors.length)], x % 2 ? -10 : 12);
  } },
  { name: "table", category: "object", solid: true, paint: (x, y) => (y >= 5 && y <= 7 && x >= 1 && x <= 14 ? (y === 5 ? [200, 150, 90] : WOOD) : (x === 2 || x === 13) && y > 7 && y < 15 ? WOOD_DARK : null) },
  { name: "bed", category: "object", solid: true, paint: (x, y) => {
    if (x < 1 || x > 14 || y < 1) return null;
    if (y <= 4) return x === 1 || x === 14 || y === 1 ? WOOD_DARK : [240, 240, 236];
    if (y >= 14) return WOOD_DARK;
    return x === 1 || x === 14 ? [130, 40, 50] : y === 5 ? [220, 80, 90] : [190, 56, 70];
  } },
  { name: "stairs_down", category: "object", exit: true, paint: (x, y) => (x === 0 || x === 15 || y === 0 ? [60, 60, 70] : shade([120, 120, 130], -Math.floor(y / 3) * 18)) },
  { name: "button", category: "object", paint: (x, y) => (y >= 12 && y <= 14 && x >= 2 && x <= 13 ? [110, 110, 120] : inEllipse(x, y, 8, 12, 4.5, 3.5) && y < 12 ? (y < 10 ? [250, 110, 110] : [200, 50, 50]) : null) },
  { name: "flag", category: "object", goal: true, paint: (x, y) => {
    if (x === 3 && y >= 1) return [200, 204, 214];
    if (y >= 15 && x >= 1 && x <= 6) return [100, 100, 110];
    if (x > 3 && y >= 1 && y <= 7 && x - 3 <= 9 - Math.abs(y - 4) * 2) return (x + y) % 3 ? [236, 64, 80] : [255, 110, 120];
    return null;
  } },
  { name: "well", category: "object", solid: true, paint: (x, y) => {
    if (y < 4) return (x === 2 || x === 13) ? WOOD_DARK : y === 1 && x > 1 && x < 14 ? [176, 64, 58] : null;
    if (y < 8) return (x === 2 || x === 13) ? WOOD_DARK : null;
    if (x < 1 || x > 14) return null;
    if (y === 8) return [160, 160, 168];
    return x >= 3 && x <= 12 && y <= 9 ? [40, 90, 160] : (x + (y % 2) * 2) % 4 === 0 ? [96, 96, 104] : [140, 140, 148];
  } },
];
