// engine/3d/texture.js
// WHAT: Make WebGL textures from image files, from a canvas you drew on, or a
//       generated checkerboard.
// WHY:  A texture is a picture wrapped onto triangles using the uv coordinates.
//       A canvas texture lets you paint textures with the 2D API: no art files needed.
// DOC:  docs/modules/3d.md

import { loadImage } from "../core/assets.js";

// options.pixelated  nearest-neighbor sampling: crisp pixel-art texels (default false)
// options.repeat     tile the texture when uvs go past 1 (default true)
export function createTexture(gl, source, options = {}) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Images have y going down; textures have v going up. Flip while uploading.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  const wrap = options.repeat === false ? gl.CLAMP_TO_EDGE : gl.REPEAT;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  if (options.pixelated) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  } else {
    // Mipmaps: smaller copies of the texture for far away surfaces, so they don't shimmer.
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }
  return texture;
}

export async function loadTexture(gl, url, options = {}) {
  const image = await loadImage(url);
  return createTexture(gl, image, options);
}

// Paint a texture with the 2D canvas API. draw(context, size) does the painting.
export function createCanvasTexture(gl, size, draw, options = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext("2d"), size);
  return createTexture(gl, canvas, options);
}

// A checkerboard: the classic "is my uv mapping right?" texture.
export function createCheckerTexture(gl, squares = 8, colorA = "#dddddd", colorB = "#555555") {
  return createCanvasTexture(gl, 64, (context, size) => {
    const cell = size / squares;
    for (let row = 0; row < squares; row++) {
      for (let column = 0; column < squares; column++) {
        context.fillStyle = (row + column) % 2 === 0 ? colorA : colorB;
        context.fillRect(column * cell, row * cell, cell, cell);
      }
    }
  }, { pixelated: true });
}
