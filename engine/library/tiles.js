// engine/library/tiles.js
// WHAT: The 2D tile library: about 90 ready-made 16 x 16 tiles (terrain, floors, liquids,
//       walls, roofs, platforms, objects, nature, hazards), each with flags the scene
//       editor and runtime understand: solid, oneWay, hurts, climb, door, goal, exit.
// WHY:  So you can build levels by hand, or in the scene editor, without drawing a
//       single sprite. Everything is painted by code; nothing to download or license.
// DOC:  docs/modules/library.md   BROWSE: library/index.html
//
// Usage:
//   import { tileCanvas, tileInfo, tileNames } from "kindling/library/tiles.js";
//   context.drawImage(tileCanvas("brick_wall"), x, y);
//   if (tileInfo("water").solid) ...

import { pixelsFromFunction, pixelsToCanvas } from "./pixels.js";
import { hash2 } from "./tile-tools.js";
import { groundTiles } from "./tiles-ground.js";
import { wallTiles } from "./tiles-walls.js";
import { propTiles } from "./tiles-props.js";

export const TILE_SIZE = 16;

export const tileCategories = ["terrain", "floor", "liquid", "wall", "roof", "platform", "object", "nature", "hazard"];

// Every tile: { name, category, solid, oneWay, hurts, climb, door, goal, exit, light, paint }
export const tileCatalog = [...groundTiles, ...wallTiles, ...propTiles];
export const tileNames = tileCatalog.map((tile) => tile.name);

const byName = new Map(tileCatalog.map((tile, index) => [tile.name, { ...tile, index }]));

// The tile's description and flags (without painting it). Unknown names return null.
export function tileInfo(name) {
  return byName.get(name) || null;
}

// See-through tiles (decoration) should be drawn on top of a ground tile.
export function isOverlayTile(name) {
  const tile = tileInfo(name);
  if (!tile) return false;
  return ["object", "nature", "hazard"].includes(tile.category) || tile.oneWay === true;
}

// Paint one tile as raw pixels { width, height, data }. Works in Node too.
const pixelCache = new Map();
export function tilePixels(name) {
  if (pixelCache.has(name)) return pixelCache.get(name);
  const tile = byName.get(name);
  if (!tile) throw new Error("No tile called '" + name + "'. See tileNames for the list.");
  const seed = tile.index + 1;
  const image = pixelsFromFunction(TILE_SIZE, TILE_SIZE, (x, y) => tile.paint(x, y, hash2(x, y, seed)));
  pixelCache.set(name, image);
  return image;
}

// Browser only: a tile as a <canvas> you can drawImage. scale 2 makes a 32 x 32 copy.
const canvasCache = new Map();
export function tileCanvas(name, scale = 1) {
  const key = name + "@" + scale;
  if (!canvasCache.has(key)) canvasCache.set(key, pixelsToCanvas(tilePixels(name), scale));
  return canvasCache.get(key);
}

// Browser only: every tile as a canvas, by name: { grass: <canvas>, ... }
export function tileCanvases() {
  const all = {};
  for (const name of tileNames) all[name] = tileCanvas(name);
  return all;
}

// Tiles in one category, for palettes: tilesIn("wall") -> ["brick_wall", ...]
export function tilesIn(category) {
  return tileCatalog.filter((tile) => tile.category === category).map((tile) => tile.name);
}
