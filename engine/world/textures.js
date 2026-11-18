// engine/world/textures.js
// WHAT: Paints every block texture from code: 16 x 16 pixel-art grass, dirt, stone,
//       wood, water, bricks... Returns raw pixels, so it works in the browser AND in
//       Node tests. Helpers turn the pixels into a canvas or a color.
// WHY:  No art files to download, license or lose. Changing a palette line repaints
//       the whole world. The look ("chunky pixels + soft lighting") is what makes
//       blocky games read well even with simple shapes.
// DOC:  docs/modules/world.md (section "Procedural textures")
//
// Every painter has the same shape: paint(pixel) is called once per pixel with
// { x, y, size, rand, noise } and returns [red, green, blue] (0..255).

import { hash2, createNoise } from "../math/noise.js";
import { textureNames } from "./blocks.js";

export const TEXTURE_SIZE = 16;
const noise = createNoise(7);

// Palette: change these to restyle the world. Picked to stay readable under fog and shade.
export const palette = {
  grass: [106, 176, 76],
  grassDark: [74, 140, 58],
  grassLight: [146, 204, 96],
  dirt: [134, 96, 67],
  dirtDark: [104, 72, 50],
  stone: [128, 132, 140],
  stoneDark: [96, 99, 108],
  sand: [226, 206, 152],
  bark: [110, 80, 52],
  barkDark: [80, 57, 38],
  wood: [196, 160, 104],
  leaves: [60, 138, 66],
  leavesDark: [40, 104, 52],
  water: [52, 124, 196],
  brick: [170, 74, 58],
  mortar: [200, 190, 176],
  snow: [238, 244, 250],
  lantern: [255, 214, 120],
  roof: [176, 64, 60],
  path: [168, 152, 124],
};

// Shift a color brighter (amount > 0) or darker (amount < 0).
function shade(color, amount) {
  return [color[0] + amount, color[1] + amount, color[2] + amount];
}

function pick(colorA, colorB, chooseB) {
  return chooseB ? colorB : colorA;
}

const painters = {
  grass_top({ x, y, rand }) {
    const blades = rand > 0.82 ? palette.grassLight : pick(palette.grass, palette.grassDark, rand < 0.22);
    return shade(blades, Math.round(noise.noise2(x * 0.4, y * 0.4) * 8));
  },
  // Dirt with a ragged strip of grass hanging over the top edge.
  grass_side({ x, y, rand }) {
    const fringe = 3 + Math.floor(hash2(x, 99) * 3);
    if (y < fringe) return pick(palette.grass, palette.grassDark, y === fringe - 1);
    return painters.dirt({ x, y, rand });
  },
  dirt({ rand }) {
    if (rand > 0.9) return shade(palette.dirt, 18);
    return pick(palette.dirt, palette.dirtDark, rand < 0.3);
  },
  // Stone: soft blotches plus a few dark cracks.
  stone({ x, y, rand }) {
    const blotch = noise.noise2(x * 0.35, y * 0.35);
    if (blotch > 0.45 && rand > 0.4) return palette.stoneDark;
    return shade(pick(palette.stone, palette.stoneDark, rand < 0.12), Math.round(blotch * 10));
  },
  sand({ rand }) {
    return shade(palette.sand, rand > 0.85 ? -22 : rand < 0.1 ? 10 : 0);
  },
  // Bark: vertical stripes that wobble a little.
  log_side({ x, y, rand }) {
    const stripe = (x + Math.floor(hash2(y >> 2, 3) * 2)) % 4 === 0;
    return shade(pick(palette.bark, palette.barkDark, stripe), rand > 0.9 ? 10 : 0);
  },
  // Tree rings: distance from the center, in steps.
  log_top({ x, y, size }) {
    const half = (size - 1) / 2;
    const ring = Math.floor(Math.hypot(x - half, y - half));
    if (ring >= half) return palette.barkDark;
    return ring % 3 === 0 ? shade(palette.wood, -28) : palette.wood;
  },
  leaves({ x, y, rand }) {
    const clump = noise.noise2(x * 0.5, y * 0.5);
    if (rand > 0.9) return shade(palette.leaves, 30);
    return pick(palette.leaves, palette.leavesDark, clump < -0.1 || rand < 0.15);
  },
  // Water: diagonal light streaks. The 3D shader slides the texture to animate it.
  water({ x, y, rand }) {
    const streak = (x + y * 2) % 11 === 0 || (x * 2 + y) % 13 === 0;
    return shade(palette.water, streak ? 34 : Math.round(rand * 8));
  },
  // Planks: four boards, with darker seams and nail dots.
  planks({ x, y, rand }) {
    const board = Math.floor(y / 4);
    if (y % 4 === 3) return shade(palette.wood, -50);
    const seam = (x + board * 7) % 16 === 0;
    return shade(palette.wood, seam ? -40 : Math.round((rand - 0.5) * 16));
  },
  // Bricks: rows offset by half a brick, mortar lines between them.
  brick({ x, y, rand }) {
    const row = Math.floor(y / 4);
    const offset = row % 2 === 0 ? 0 : 4;
    if (y % 4 === 3 || (x + offset) % 8 === 7) return palette.mortar;
    return shade(palette.brick, Math.round((rand - 0.5) * 22));
  },
  snow({ rand }) {
    return shade(palette.snow, rand > 0.85 ? -14 : 0);
  },
  snow_side({ x, y, rand }) {
    const edge = 4 + Math.floor(hash2(x, 41) * 3);
    if (y < edge) return painters.snow({ rand });
    return painters.dirt({ x, y, rand });
  },
  // Lantern: a dark frame with a glowing middle.
  lantern({ x, y, size }) {
    const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1;
    const bars = x % 5 === 2 && !edge;
    if (edge) return [70, 52, 36];
    if (bars) return [120, 90, 50];
    const center = 1 - Math.hypot(x - size / 2, y - size / 2) / size;
    return shade(palette.lantern, Math.round(center * 40));
  },
  // Roof tiles: scalloped rows.
  roof({ x, y, rand }) {
    const row = Math.floor(y / 4);
    const inRow = y % 4;
    const shadowEdge = inRow === 3 || (inRow === 2 && (x + row * 2) % 4 === 0);
    return shade(palette.roof, shadowEdge ? -48 : Math.round((rand - 0.5) * 14));
  },
  path({ x, y, rand }) {
    const pebble = noise.noise2(x * 0.7, y * 0.7) > 0.3;
    return shade(palette.path, pebble ? 18 : Math.round((rand - 0.5) * 20));
  },
  // Grass with little red and yellow flowers.
  flowers({ x, y, rand }) {
    const flower = hash2(x >> 1, y >> 1, 5);
    if (flower > 0.93) return [236, 84, 92];
    if (flower > 0.88) return [250, 220, 90];
    return painters.grass_top({ x, y, rand });
  },
};

// Paint one texture. Returns { width, height, data } like an ImageData.
export function paintTexture(name, size = TEXTURE_SIZE) {
  const painter = painters[name];
  if (!painter) throw new Error("No texture painter called '" + name + "'");
  const data = new Uint8ClampedArray(size * size * 4);
  const seed = textureNames.indexOf(name) + 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const rgb = painter({ x, y, size, rand: hash2(x, y, seed) });
      const index = (y * size + x) * 4;
      data[index] = rgb[0];
      data[index + 1] = rgb[1];
      data[index + 2] = rgb[2];
      data[index + 3] = 255;
    }
  }
  return { width: size, height: size, data };
}

// Paint every block texture, in the order of textureNames (layer order in 3D).
export function paintAllTextures(size = TEXTURE_SIZE) {
  return textureNames.map((name) => paintTexture(name, size));
}

// The average color of a texture as [r, g, b]: used for minimaps and far-away shading.
export function averageColor(texture) {
  let red = 0;
  let green = 0;
  let blue = 0;
  const count = texture.width * texture.height;
  for (let i = 0; i < count; i++) {
    red += texture.data[i * 4];
    green += texture.data[i * 4 + 1];
    blue += texture.data[i * 4 + 2];
  }
  return [Math.round(red / count), Math.round(green / count), Math.round(blue / count)];
}

// Browser only: put a painted texture on a <canvas> so Canvas 2D can draw it.
export function textureToCanvas(texture) {
  const canvas = document.createElement("canvas");
  canvas.width = texture.width;
  canvas.height = texture.height;
  const context = canvas.getContext("2d");
  context.putImageData(new ImageData(texture.data, texture.width, texture.height), 0, 0);
  return canvas;
}

// Browser only: every texture as a canvas, by name. Views share one set via this cache.
let canvasCache = null;
export function textureCanvases() {
  if (!canvasCache) {
    canvasCache = {};
    for (const name of textureNames) canvasCache[name] = textureToCanvas(paintTexture(name));
  }
  return canvasCache;
}
