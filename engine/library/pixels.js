// engine/library/pixels.js
// WHAT: Small helpers for pixel art kept as raw pixels: make an empty image, paint one
//       from rows of letters, set and blend pixels, flip, and turn the result into a
//       <canvas> for drawing.
// WHY:  Raw pixels ({ width, height, data }) work in Node tests and in the browser, and
//       every library picture (tiles, sprites, characters) is built with the same tools.
// DOC:  docs/modules/library.md

// An empty, fully transparent image.
export function createPixels(width, height = width) {
  return { width, height, data: new Uint8ClampedArray(width * height * 4) };
}

// "#ff8800" or "#f80" or [r, g, b] or [r, g, b, a] -> [r, g, b, a]
export function toRGBA(color) {
  if (Array.isArray(color)) return [color[0], color[1], color[2], color[3] ?? 255];
  let hex = color.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const value = parseInt(hex, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, hex.length === 8 ? value & 255 : 255];
}

export function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height || !color) return;
  const [red, green, blue, alpha] = toRGBA(color);
  const index = (y * image.width + x) * 4;
  image.data[index] = red;
  image.data[index + 1] = green;
  image.data[index + 2] = blue;
  image.data[index + 3] = alpha;
}

export function getPixel(image, x, y) {
  const index = (y * image.width + x) * 4;
  return [image.data[index], image.data[index + 1], image.data[index + 2], image.data[index + 3]];
}

export function fillPixels(image, x, y, width, height, color) {
  for (let row = y; row < y + height; row++) for (let column = x; column < x + width; column++) setPixel(image, column, row, color);
}

// Paint from rows of letters. Each letter is looked up in legend; "." and " " are empty.
//   pixelsFromRows([".yy.", "yYYy", ".yy."], { y: "#d99a1e", Y: "#ffd34d" })
export function pixelsFromRows(rows, legend) {
  const width = Math.max(...rows.map((row) => row.length));
  const image = createPixels(width, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = legend[row[x]];
      if (color) setPixel(image, x, y, color);
    }
  });
  return image;
}

// Paint every pixel with a function (x, y) -> color or null (leave it transparent).
export function pixelsFromFunction(width, height, paint) {
  const image = createPixels(width, height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) setPixel(image, x, y, paint(x, y));
  return image;
}

// A mirror image (left <-> right), for sprites that face the other way.
export function flipPixels(image) {
  const flipped = createPixels(image.width, image.height);
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) setPixel(flipped, image.width - 1 - x, y, getPixel(image, x, y));
  return flipped;
}

// Draw `top` over `bottom` at (x, y), respecting transparency (no partial alpha blending).
export function stampPixels(bottom, top, x = 0, y = 0) {
  for (let row = 0; row < top.height; row++) {
    for (let column = 0; column < top.width; column++) {
      const color = getPixel(top, column, row);
      if (color[3] > 0) setPixel(bottom, x + column, y + row, color);
    }
  }
  return bottom;
}

// Browser only: raw pixels -> <canvas>, optionally scaled up with crisp pixels.
export function pixelsToCanvas(image, scale = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width * scale;
  canvas.height = image.height * scale;
  const context = canvas.getContext("2d");
  const source = document.createElement("canvas");
  source.width = image.width;
  source.height = image.height;
  source.getContext("2d").putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
  context.imageSmoothingEnabled = false;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Add a 1-pixel outline around every opaque shape (a classic pixel-art finish).
export function outlinePixels(image, color = "#1a1c22") {
  const result = createPixels(image.width, image.height);
  result.data.set(image.data);
  const opaque = (x, y) => x >= 0 && y >= 0 && x < image.width && y < image.height && image.data[(y * image.width + x) * 4 + 3] > 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (opaque(x, y)) continue;
      if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) setPixel(result, x, y, color);
    }
  }
  return result;
}
