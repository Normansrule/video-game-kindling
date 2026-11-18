// engine/views/raycast-view.js
// WHAT: The 2.5D first-person view of a block world, drawn the way early 1990s
//       shooters did it: one ray per screen column finds the nearest wall, and
//       the wall slice is drawn taller when it is closer. Floors are "cast" per
//       pixel, props are flat billboards that always face you, and fog fades the
//       distance into the sky.
// WHY:  It looks 3D but the world is really a flat 2D grid seen at eye level, so
//       everything is plain arithmetic on a pixel buffer, no graphics card needed.
//       It is the best way to SEE how perspective works: closer = bigger, 1 / distance.
// DOC:  docs/modules/views.md (section "Raycaster")   VIZ: viz/11-raycaster/, viz/14-world-modes/
//
// The grid it sees: a column is a wall if the block at HEAD height is solid.

import { BLOCK, blockType, isSolid } from "../world/blocks.js";
import { paintTexture, TEXTURE_SIZE } from "../world/textures.js";
import { spriteCanvases } from "./sprites.js";

const EYE_HEIGHT = 1.6;    // blocks above the floor
const WALL_HEIGHT = 2;     // walls are drawn two blocks tall

// options.resolution: internal width in pixels (default 320; the canvas scales it up).
export function createRaycastView(canvas, world, options = {}) {
  const context = canvas.getContext("2d");
  const renderWidth = options.resolution || 320;
  const renderHeight = Math.round(renderWidth * canvas.height / canvas.width);
  const buffer = document.createElement("canvas");
  buffer.width = renderWidth;
  buffer.height = renderHeight;
  const bufferContext = buffer.getContext("2d");
  const image = bufferContext.createImageData(renderWidth, renderHeight);
  const pixels = image.data;
  const depth = new Float32Array(renderWidth);       // wall distance per column, for sprites
  const fieldOfView = options.fieldOfView || 1.15;   // radians, about 66 degrees
  const textures = {};
  const sprites = spriteCanvases();
  const sky = { top: [86, 140, 214], horizon: [196, 222, 240] };
  const fogDistance = options.fogDistance || 22;

  function texture(name) {
    if (!textures[name]) textures[name] = paintTexture(name).data;
    return textures[name];
  }

  function setPixel(index, red, green, blue) {
    pixels[index] = red;
    pixels[index + 1] = green;
    pixels[index + 2] = blue;
    pixels[index + 3] = 255;
  }

  // Blend a color toward the horizon color: 0 = near, 1 = lost in the fog.
  function fogged(value, channel, amount) {
    return value + (sky.horizon[channel] - value) * amount;
  }

  // player: { x, y, z, yaw }. yaw 0 looks north (-z), same as the 3D camera.
  function render(player) {
    const level = Math.floor(player.y + 0.01);       // the block layer your feet are in
    const directionX = -Math.sin(player.yaw);
    const directionZ = -Math.cos(player.yaw);
    // The "camera plane": at right angles to the view, its length sets the field of view.
    const planeLength = Math.tan(fieldOfView / 2);
    const planeX = Math.cos(player.yaw) * planeLength;
    const planeZ = -Math.sin(player.yaw) * planeLength;
    const horizon = Math.floor(renderHeight / 2);
    const eye = EYE_HEIGHT + (player.y - level);     // eye height above this floor
    // Pixels per world unit at distance 1. The same scale sideways and up, so pixels are square.
    const projection = renderWidth / 2 / planeLength;

    // 1. Sky: a gradient, top to horizon.
    for (let y = 0; y < horizon; y++) {
      const t = y / horizon;
      const red = sky.top[0] + (sky.horizon[0] - sky.top[0]) * t;
      const green = sky.top[1] + (sky.horizon[1] - sky.top[1]) * t;
      const blue = sky.top[2] + (sky.horizon[2] - sky.top[2]) * t;
      for (let x = 0; x < renderWidth; x++) setPixel((y * renderWidth + x) * 4, red, green, blue);
    }

    // 2. Floor casting: for each row below the horizon, how far away is that floor line?
    for (let y = horizon; y < renderHeight; y++) {
      const rowDistance = (eye * projection) / (y - horizon + 0.5);
      const fog = Math.min(1, rowDistance / fogDistance);
      // World positions of the leftmost and rightmost pixel on this row; step between them.
      let floorX = player.x + rowDistance * (directionX - planeX);
      let floorZ = player.z + rowDistance * (directionZ - planeZ);
      const stepX = (rowDistance * 2 * planeX) / renderWidth;
      const stepZ = (rowDistance * 2 * planeZ) / renderWidth;
      for (let x = 0; x < renderWidth; x++) {
        const cellX = Math.floor(floorX);
        const cellZ = Math.floor(floorZ);
        let id = world.get(cellX, level, cellZ);           // a low step at foot level
        if (!isSolid(id) && id !== BLOCK.WATER) id = world.get(cellX, level - 1, cellZ);
        let shade = 1;
        if (id === BLOCK.AIR) { id = world.get(cellX, world.topY(cellX, cellZ), cellZ); shade = 0.6; }
        const tex = texture(blockType(id).top || "water");
        const textureX = Math.floor((floorX - cellX) * TEXTURE_SIZE) & (TEXTURE_SIZE - 1);
        const textureY = Math.floor((floorZ - cellZ) * TEXTURE_SIZE) & (TEXTURE_SIZE - 1);
        const source = (textureY * TEXTURE_SIZE + textureX) * 4;
        const index = (y * renderWidth + x) * 4;
        setPixel(index, fogged(tex[source] * shade, 0, fog), fogged(tex[source + 1] * shade, 1, fog), fogged(tex[source + 2] * shade, 2, fog));
        floorX += stepX;
        floorZ += stepZ;
      }
    }

    // 3. Walls: one ray per column, stepping cell by cell (the DDA grid walk).
    for (let column = 0; column < renderWidth; column++) {
      const cameraX = (2 * column) / renderWidth - 1;           // -1 left .. +1 right
      const rayX = directionX + planeX * cameraX;
      const rayZ = directionZ + planeZ * cameraX;
      let cellX = Math.floor(player.x);
      let cellZ = Math.floor(player.z);
      const crossX = Math.abs(1 / rayX);
      const crossZ = Math.abs(1 / rayZ);
      const stepX = rayX < 0 ? -1 : 1;
      const stepZ = rayZ < 0 ? -1 : 1;
      let nextX = (rayX < 0 ? player.x - cellX : cellX + 1 - player.x) * crossX;
      let nextZ = (rayZ < 0 ? player.z - cellZ : cellZ + 1 - player.z) * crossZ;
      let hitSide = 0;
      let distance = fogDistance;
      let hitId = BLOCK.AIR;
      for (let steps = 0; steps < 64; steps++) {
        if (nextX < nextZ) { distance = nextX; nextX += crossX; cellX += stepX; hitSide = 0; }
        else { distance = nextZ; nextZ += crossZ; cellZ += stepZ; hitSide = 1; }
        if (distance > fogDistance) break;
        if (isSolid(world.get(cellX, level + 1, cellZ))) { hitId = world.get(cellX, level + 1, cellZ); break; }
      }
      depth[column] = hitId === BLOCK.AIR ? Infinity : distance;
      if (hitId === BLOCK.AIR) continue;

      // Where along the wall the ray hit (0..1), for the texture column.
      let wallX = hitSide === 0 ? player.z + distance * rayZ : player.x + distance * rayX;
      wallX = wallX - Math.floor(wallX);
      const textureX = Math.floor(wallX * TEXTURE_SIZE);
      const top = horizon - ((WALL_HEIGHT - eye) * projection) / distance;
      const bottom = horizon + (eye * projection) / distance;
      const fog = Math.min(1, distance / fogDistance);
      const sideShade = hitSide === 0 ? 0.78 : 1;            // east/west walls a bit darker
      for (let y = Math.max(0, Math.floor(top)); y < Math.min(renderHeight, Math.ceil(bottom)); y++) {
        // Height on the wall in blocks, 0 = floor. Which block, and where inside it.
        const wallHeight = ((bottom - y) / (bottom - top)) * WALL_HEIGHT;
        const blockLayer = Math.min(WALL_HEIGHT - 1, Math.floor(wallHeight));
        let id = world.get(cellX, level + blockLayer, cellZ);
        if (!isSolid(id)) id = hitId;
        const tex = texture(blockType(id).side);
        const textureY = Math.max(0, Math.min(TEXTURE_SIZE - 1, Math.floor((1 - (wallHeight - blockLayer)) * TEXTURE_SIZE)));
        const source = (textureY * TEXTURE_SIZE + textureX) * 4;
        const index = (y * renderWidth + column) * 4;
        setPixel(index, fogged(tex[source] * sideShade, 0, fog), fogged(tex[source + 1] * sideShade, 1, fog), fogged(tex[source + 2] * sideShade, 2, fog));
      }
    }
    bufferContext.putImageData(image, 0, 0);

    // 4. Billboards (props): far ones first, each column hidden if a wall is nearer.
    const visible = world.props
      .filter((prop) => !prop.hidden)
      .map((prop) => ({ prop, distance: Math.hypot(prop.x - player.x, prop.z - player.z) }))
      .sort((a, b) => b.distance - a.distance);
    const inverse = 1 / (planeX * directionZ - directionX * planeZ);
    for (const { prop } of visible) {
      const relativeX = prop.x - player.x;
      const relativeZ = prop.z - player.z;
      // Camera space: how far to the side, and how far in front.
      const side = inverse * (directionZ * relativeX - directionX * relativeZ);
      const ahead = inverse * (-planeZ * relativeX + planeX * relativeZ);
      if (ahead <= 0.2 || ahead > fogDistance) continue;
      const screenX = Math.floor((renderWidth / 2) * (1 + side / ahead));
      const size = (0.6 * projection) / ahead;
      const groundY = horizon + ((eye - (prop.y - level) - 0.35) * projection) / ahead;
      const sprite = sprites[prop.kind] || sprites.coin;
      for (let column = Math.floor(screenX - size / 2); column < screenX + size / 2; column++) {
        if (column < 0 || column >= renderWidth || depth[column] < ahead) continue;
        const sourceX = Math.floor(((column - (screenX - size / 2)) / size) * sprite.width);
        bufferContext.drawImage(sprite, sourceX, 0, 1, sprite.height, column, groundY - size, 1, size);
      }
    }

    context.imageSmoothingEnabled = false;
    context.drawImage(buffer, 0, 0, canvas.width, canvas.height);
  }

  return { canvas, render };
}
