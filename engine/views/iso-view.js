// engine/views/iso-view.js
// WHAT: The 2.5D isometric view of a block world: a diorama seen from above at an
//       angle, every block drawn as three textured faces (top, south, east).
// WHY:  Isometric games (city builders, tactics, cozy farming games) look 3D but
//       are drawn with plain 2D images. The whole trick is one formula that turns a
//       3D block position into a 2D screen position:
//           screenX = (x - z) * halfWidth
//           screenY = (x + z) * quarterWidth - y * blockHeight
//       and drawing back-to-front (the "painter's algorithm") so near blocks cover far ones.
// DOC:  docs/modules/views.md (section "Isometric")   VIZ: viz/14-world-modes/

import { BLOCK, blockType, isTransparent } from "../world/blocks.js";
import { textureCanvases, averageColor, paintTexture } from "../world/textures.js";
import { spriteCanvases } from "./sprites.js";

// options.tileWidth: width of one block's top diamond in pixels (default 32).
export function createIsoView(canvas, world, options = {}) {
  const context = canvas.getContext("2d");
  const tileWidth = options.tileWidth || 32;
  const halfWidth = tileWidth / 2;
  const quarterWidth = tileWidth / 4;
  const blockHeight = halfWidth;
  const textures = textureCanvases();
  const sprites = spriteCanvases();
  const averages = {};
  const baked = document.createElement("canvas");
  let bakedVersion = -1;
  const originX = world.depth * halfWidth;
  const originY = world.height * blockHeight + 8;

  // The formula: a 3D point -> a 2D point on the baked canvas.
  function project(x, y, z) {
    return {
      x: originX + (x - z) * halfWidth,
      y: originY + (x + z) * quarterWidth - y * blockHeight,
    };
  }

  function average(name) {
    if (!averages[name]) averages[name] = "rgb(" + averageColor(paintTexture(name)).join(",") + ")";
    return averages[name];
  }

  // Draw a 16 x 16 texture onto a parallelogram: corner `origin`, edges `uEdge` and `vEdge`.
  // setTransform does the bending: it maps the texture's x axis to uEdge, y axis to vEdge.
  function drawFace(target, textureName, origin, uEdge, vEdge, darkness) {
    const corners = [origin, add(origin, uEdge), add(add(origin, uEdge), vEdge), add(origin, vEdge)];
    // Fill with the texture's average color first: hides hairline gaps between faces.
    target.fillStyle = average(textureName);
    fillPolygon(target, corners);
    const texture = textures[textureName];
    target.setTransform(uEdge.x / texture.width, uEdge.y / texture.width, vEdge.x / texture.height, vEdge.y / texture.height, origin.x, origin.y);
    target.drawImage(texture, 0, 0);
    target.setTransform(1, 0, 0, 1, 0, 0);
    if (darkness > 0) {
      target.fillStyle = "rgba(12,16,40," + darkness + ")";
      fillPolygon(target, corners);
    }
  }

  function covers(id) {
    return id !== BLOCK.AIR && !isTransparent(id);
  }

  function bake() {
    baked.width = (world.width + world.depth) * halfWidth;
    baked.height = originY + (world.width + world.depth) * quarterWidth + 8;
    const target = baked.getContext("2d");
    target.imageSmoothingEnabled = false;
    // Painter's algorithm: far diagonals first (small x + z), and bottom to top.
    for (let diagonal = 0; diagonal < world.width + world.depth - 1; diagonal++) {
      for (let x = 0; x < world.width; x++) {
        const z = diagonal - x;
        if (z < 0 || z >= world.depth) continue;
        for (let y = 0; y < world.height; y++) {
          const id = world.get(x, y, z);
          if (id === BLOCK.AIR) continue;
          drawBlock(target, x, y, z, id);
        }
      }
    }
    bakedVersion = world.version;
  }

  function drawBlock(target, x, y, z, id) {
    const type = blockType(id);
    const liquid = type.liquid === true;
    const above = world.get(x, y + 1, z);
    if (liquid) {
      if (above !== BLOCK.AIR) return;
      target.globalAlpha = 0.78;
    }
    // Top face, if nothing solid sits on it. Darker when blocks crowd around it
    // (a cheap ambient occlusion) or when a taller neighbor to the north-west shades it.
    if (!covers(above) && !(liquid && above === BLOCK.WATER)) {
      let crowd = 0;
      for (const [dx, dz] of [[-1, 0], [0, -1], [1, 0], [0, 1]]) if (covers(world.get(x + dx, y + 1, z + dz))) crowd++;
      const shadow = covers(world.get(x - 1, y + 2, z)) || covers(world.get(x, y + 2, z - 1)) ? 0.2 : 0;
      const topY = liquid ? y + 0.88 : y + 1;
      drawFace(target, type.top, project(x, topY, z), { x: halfWidth, y: quarterWidth }, { x: -halfWidth, y: quarterWidth }, crowd * 0.07 + shadow);
    }
    if (!liquid) {
      // South face (toward +z, lower left) and east face (toward +x, lower right).
      if (!covers(world.get(x, y, z + 1))) {
        drawFace(target, type.side, project(x, y + 1, z + 1), { x: halfWidth, y: quarterWidth }, { x: 0, y: blockHeight }, 0.16);
      }
      if (!covers(world.get(x + 1, y, z))) {
        drawFace(target, type.side, project(x + 1, y + 1, z + 1), { x: halfWidth, y: -quarterWidth }, { x: 0, y: blockHeight }, 0.34);
      }
    }
    target.globalAlpha = 1;
  }

  // player: { x, y, z }. zoom: 1 = one baked pixel per screen pixel.
  function render(player, time = 0, zoom = 1) {
    if (world.version !== bakedVersion) bake();
    const width = canvas.width;
    const height = canvas.height;
    context.setTransform(1, 0, 0, 1, 0, 0);
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#9ccbf0");
    gradient.addColorStop(1, "#dfeefa");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = false;
    const center = project(player.x, player.y, player.z);
    context.setTransform(zoom, 0, 0, zoom, Math.round(width / 2 - center.x * zoom), Math.round(height / 2 - center.y * zoom));
    context.drawImage(baked, 0, 0);
    // Props and the player go on top, sorted far to near.
    const things = world.props.filter((prop) => !prop.hidden).map((prop) => ({ ...prop, sprite: sprites[prop.kind] || sprites.coin }));
    things.push({ x: player.x, y: player.y, z: player.z, sprite: sprites.character, isPlayer: true });
    things.sort((a, b) => a.x + a.z - (b.x + b.z));
    for (const thing of things) {
      const point = project(thing.x, thing.y, thing.z);
      const scale = thing.isPlayer ? 2.2 : 1.6;
      const bob = thing.isPlayer ? 0 : Math.sin(time * 3 + thing.x) * 2;
      context.fillStyle = "rgba(0,0,0,0.28)";
      context.beginPath();
      context.ellipse(point.x, point.y, halfWidth * 0.45, quarterWidth * 0.45, 0, 0, Math.PI * 2);
      context.fill();
      const spriteWidth = thing.sprite.width * scale;
      const spriteHeight = thing.sprite.height * scale;
      context.drawImage(thing.sprite, Math.round(point.x - spriteWidth / 2), Math.round(point.y - spriteHeight - 2 + bob), spriteWidth, spriteHeight);
    }
    context.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { canvas, render, bake, project };
}

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function fillPolygon(context, points) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) context.lineTo(points[i].x, points[i].y);
  context.closePath();
  context.fill();
}
