// engine/2d/atlas.js
// WHAT: Texture atlases: many pictures of different sizes packed into one image,
//       plus a list of where each one is ("hero-run-0" is at x 34, y 0, 16 x 20).
// WHY:  createSpriteSheet() needs every frame the same size. Real art isn't: a tree
//       is bigger than a coin. Packing lets one image hold all of it, so the game
//       loads one file and the GPU (or canvas) switches images less often.
//       make/sprite-packer/ uses packRects() to build the image and the list.
// DOC:  docs/modules/2d.md (Texture atlases)   TOOL: make/sprite-packer/

import { drawRegion } from "./sprite.js";

// Pack rectangles into a small image.
//
// items:   [{ name, width, height }]
// options: maxWidth (default 1024), padding between pictures in pixels (default 1),
//          powerOfTwo (round the final size up to 2, 4, 8 ... 1024; some GPUs want it)
// returns: { width, height, frames: { name: { x, y, width, height } }, fits }
//          fits is false if something is wider than maxWidth.
//
// A narrow image grows tall and a wide one grows long, so this tries a range of
// widths and keeps the one with the smallest area (the squarer one on a tie).
export function packRects(items, options = {}) {
  const maxWidth = options.maxWidth || 1024;
  const padding = options.padding === undefined ? 1 : options.padding;
  const round = (size) => (options.powerOfTwo ? 2 ** Math.ceil(Math.log2(Math.max(1, size))) : size);
  if (items.length === 0) return { width: 0, height: 0, frames: {}, fits: true };

  const widest = Math.min(maxWidth, Math.max(...items.map((item) => item.width + padding)));
  const area = items.reduce((sum, item) => sum + (item.width + padding) * (item.height + padding), 0);
  const widths = new Set([widest, maxWidth]);
  const stepSize = Math.max(1, Math.round((maxWidth - widest) / 32));
  for (let width = widest; width < maxWidth; width += stepSize) widths.add(width);
  for (const factor of [1, 1.15, 1.3, 1.5, 2]) widths.add(Math.min(maxWidth, Math.max(widest, Math.ceil(Math.sqrt(area) * factor))));

  let best = null;
  for (const width of widths) {
    const result = packSkyline(items, width, padding);
    result.width = round(result.width);
    result.height = round(result.height);
    const score = result.width * result.height;
    const squareness = Math.abs(result.width - result.height);
    // Placing everything beats anything else; then smaller area; then squarer.
    if (!best || (result.fits && !best.fits) ||
        (result.fits === best.fits && (score < best.score || (score === best.score && squareness < best.squareness)))) {
      best = { ...result, score, squareness };
    }
  }
  const { score, squareness, ...packed } = best;
  return packed;
}

// One packing pass at a fixed width, using a "skyline": the outline of the tops
// of everything placed so far, like a city skyline. Each new rectangle goes where
// its bottom edge would be lowest, so gaps fill from the bottom up.
export function packSkyline(items, maxWidth, padding = 1) {
  // Tallest first (ties: widest first, then by name, so the result never changes).
  const sorted = [...items].sort((a, b) => b.height - a.height || b.width - a.width || (a.name < b.name ? -1 : 1));
  let skyline = [{ x: 0, y: 0, width: maxWidth }];
  const frames = {};
  let usedWidth = 0;
  let usedHeight = 0;
  let fits = true;

  for (const item of sorted) {
    const width = item.width + padding;
    const height = item.height + padding;
    let best = null;
    for (let index = 0; index < skyline.length; index++) {
      const y = restingY(skyline, index, width, maxWidth);
      if (y === null) continue;
      const x = skyline[index].x;
      // Lowest bottom edge wins; on a tie, the leftmost.
      if (!best || y + height < best.y + best.height || (y + height === best.y + best.height && x < best.x)) {
        best = { x, y, height };
      }
    }
    if (!best) {
      fits = false;
      continue;
    }
    frames[item.name] = { x: best.x, y: best.y, width: item.width, height: item.height };
    skyline = raise(skyline, best.x, width, best.y + height);
    usedWidth = Math.max(usedWidth, best.x + item.width);
    usedHeight = Math.max(usedHeight, best.y + item.height);
  }
  return { width: usedWidth, height: usedHeight, frames, fits };
}

// The y where a box `width` wide would rest if its left edge sits at skyline[index].x:
// the highest skyline segment underneath it. null if it would stick out on the right.
function restingY(skyline, index, width, maxWidth) {
  const left = skyline[index].x;
  if (left + width > maxWidth) return null;
  let y = 0;
  for (let i = index; i < skyline.length && skyline[i].x < left + width; i++) y = Math.max(y, skyline[i].y);
  return y;
}

// The new skyline after placing a box from x to x + width with its top at `top`.
function raise(skyline, x, width, top) {
  const right = x + width;
  const result = [{ x, y: top, width }];
  for (const segment of skyline) {
    const segmentRight = segment.x + segment.width;
    if (segmentRight <= x || segment.x >= right) {
      result.push(segment);              // not under the new box: unchanged
      continue;
    }
    // Keep the bits of this segment that stick out left or right of the box.
    if (segment.x < x) result.push({ x: segment.x, y: segment.y, width: x - segment.x });
    if (segmentRight > right) result.push({ x: right, y: segment.y, width: segmentRight - right });
  }
  // Join neighbours at the same height, so the skyline stays short.
  const merged = [];
  for (const segment of result.sort((a, b) => a.x - b.x)) {
    const last = merged[merged.length - 1];
    if (last && last.y === segment.y && last.x + last.width === segment.x) last.width += segment.width;
    else merged.push({ ...segment });
  }
  return merged;
}

// How much of the packed image is pictures rather than empty space, 0..1.
export function packEfficiency(packed) {
  const area = Object.values(packed.frames).reduce((sum, frame) => sum + frame.width * frame.height, 0);
  return packed.width * packed.height === 0 ? 0 : area / (packed.width * packed.height);
}

// Use a packed image. data is the JSON make/sprite-packer saves:
//   { "frames": { "coin": { "x": 0, "y": 0, "width": 8, "height": 8 }, ... } }
export function createAtlas(image, data) {
  const frames = data.frames;
  const atlas = {
    image,
    frames,
    names: Object.keys(frames),
    has: (name) => name in frames,
    frame(name) {
      const frame = frames[name];
      if (!frame) throw new Error('No frame called "' + name + '" in this atlas');
      return frame;
    },
    // Same options as sprite.js: flipX, flipY, rotation, scale, alpha, originX, originY.
    draw(context, name, x, y, options = {}) {
      drawRegion(context, image, atlas.frame(name), x, y, options);
    },
    // Frames named "hero-run-0", "hero-run-1", ... in number order, ready for
    // createAnimation(atlas.sequence("hero-run"), 12).
    sequence(prefix) {
      const pattern = new RegExp("^" + prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[-_ ]?(\\d+)$");
      return atlas.names
        .map((name) => ({ name, match: name.match(pattern) }))
        .filter((entry) => entry.match)
        .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))
        .map((entry) => entry.name);
    },
  };
  return atlas;
}
