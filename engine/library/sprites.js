// engine/library/sprites.js
// WHAT: The sprite library: about 30 small pixel-art pictures (items, creatures and
//       effects), some with two animation frames. Get one as raw pixels or a canvas.
// WHY:  Pickups, enemies and effects for any 2D game, with no image files. The art is
//       plain text in sprite-art.js, so you can change it in your code editor.
// DOC:  docs/modules/library.md   BROWSE: library/index.html
//
// Usage:
//   import { spriteCanvas, spriteFrames } from "kindling/library/sprites.js";
//   context.drawImage(spriteCanvas("coin", 2), x, y);          // 2 = twice as big
//   const flap = spriteFrames("bat");                           // [canvas, canvas]
//   context.drawImage(flap[Math.floor(time * 6) % flap.length], x, y);

import { PALETTE, SPRITE_ART } from "./sprite-art.js";
import { pixelsFromRows, pixelsToCanvas } from "./pixels.js";

export const spriteNames = Object.keys(SPRITE_ART);
export const spriteCategories = ["item", "creature", "effect"];

export function spriteInfo(name) {
  const art = SPRITE_ART[name];
  if (!art) return null;
  return { name, category: art.category, frameCount: art.frames.length, width: art.frames[0][0].length, height: art.frames[0].length };
}

export function spritesIn(category) {
  return spriteNames.filter((name) => SPRITE_ART[name].category === category);
}

// Raw pixels for one frame. Works in Node. legend lets you recolor: { G: "#f0a" }.
export function spritePixels(name, frame = 0, legend = null) {
  const art = SPRITE_ART[name];
  if (!art) throw new Error("No sprite called '" + name + "'. See spriteNames for the list.");
  const rows = art.frames[frame % art.frames.length];
  return pixelsFromRows(rows, legend ? { ...PALETTE, ...legend } : PALETTE);
}

// Browser only. Cached per name, frame and scale.
const cache = new Map();
export function spriteCanvas(name, scale = 1, frame = 0) {
  const key = name + "/" + frame + "@" + scale;
  if (!cache.has(key)) cache.set(key, pixelsToCanvas(spritePixels(name, frame), scale));
  return cache.get(key);
}

// Browser only: every frame of an animated sprite, ready for an animation loop.
export function spriteFrames(name, scale = 1) {
  return SPRITE_ART[name].frames.map((rows, frame) => spriteCanvas(name, scale, frame));
}
