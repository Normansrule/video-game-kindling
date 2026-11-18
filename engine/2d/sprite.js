// engine/2d/sprite.js
// WHAT: Draw images and frames from a sprite sheet (many small pictures in one image),
//       with flipping, rotation, scale and transparency.
// WHY:  One image for all of a character's frames loads faster and is how almost
//       every 2D art pack (Kenney, OpenGameArt) ships its art.
// DOC:  docs/modules/2d.md   VIZ: viz/03-sprites/

// Cut an image into a grid of equal frames, numbered left to right, top to bottom.
//   0 1 2 3
//   4 5 6 7
export function createSpriteSheet(image, frameWidth, frameHeight) {
  const columns = Math.floor(image.width / frameWidth);
  const rows = Math.floor(image.height / frameHeight);

  // Where frame `index` sits inside the image.
  function frameRect(index) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return { x: column * frameWidth, y: row * frameHeight, width: frameWidth, height: frameHeight };
  }

  // Draw frame `index` with its top-left at (x, y) unless options.origin says otherwise.
  function draw(context, index, x, y, options = {}) {
    drawFrame(context, image, frameRect(index), x, y, options);
  }

  return { image, frameWidth, frameHeight, columns, rows, frameCount: columns * rows, frameRect, draw };
}

// Draw a whole image the same way (for single-picture sprites).
export function drawImage(context, image, x, y, options = {}) {
  drawFrame(context, image, { x: 0, y: 0, width: image.width, height: image.height }, x, y, options);
}

// Draw any rectangle {x, y, width, height} of an image the same way. Texture
// atlases (engine/2d/atlas.js) use this for frames of different sizes.
export function drawRegion(context, image, source, x, y, options = {}) {
  drawFrame(context, image, source, x, y, options);
}

// options:
//   flipX, flipY   mirror the picture (a character facing left)
//   rotation       radians, around the origin
//   scale          1 = normal size
//   alpha          0..1 transparency
//   originX/Y      0..1 point of the frame placed at (x, y): 0,0 = top-left, 0.5,0.5 = center
function drawFrame(context, image, source, x, y, options) {
  const scale = options.scale || 1;
  const originX = options.originX || 0;
  const originY = options.originY || 0;
  const width = source.width * scale;
  const height = source.height * scale;

  context.save();
  if (options.alpha !== undefined) context.globalAlpha = options.alpha;
  // Move to the anchor point, rotate and flip there, then draw offset by the origin.
  context.translate(Math.round(x), Math.round(y));
  if (options.rotation) context.rotate(options.rotation);
  context.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
  context.drawImage(
    image,
    source.x, source.y, source.width, source.height,
    -originX * width, -originY * height, width, height
  );
  context.restore();
}
