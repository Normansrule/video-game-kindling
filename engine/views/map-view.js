// engine/views/map-view.js
// WHAT: The 2D view of a block world: straight down from above, like a map. Each
//       column shows the texture of its top block, lit by height, with soft shadows
//       on the side away from the sun and see-through shallow water.
// WHY:  Top-down 2D is the simplest way to show a world (most jam games use it).
//       The trick that makes it look good is baking: the world rarely changes, so we
//       paint it ONCE to a hidden canvas and copy that each frame. Copying one image
//       is far cheaper than drawing 4,000 tiles 60 times a second.
// DOC:  docs/modules/views.md (section "2D map")   VIZ: viz/14-world-modes/

import { BLOCK, blockType } from "../world/blocks.js";
import { textureCanvases } from "../world/textures.js";
import { drawCharacterIcon } from "./sprites.js";

// options.tileSize: screen pixels per block (default 16).
export function createMapView(canvas, world, options = {}) {
  const context = canvas.getContext("2d");
  const tileSize = options.tileSize || 16;
  const textures = textureCanvases();
  const baked = document.createElement("canvas");
  let bakedVersion = -1;

  // Paint the whole world to the hidden canvas.
  function bake() {
    baked.width = world.width * tileSize;
    baked.height = world.depth * tileSize;
    const bakedContext = baked.getContext("2d");
    bakedContext.imageSmoothingEnabled = false;
    for (let z = 0; z < world.depth; z++) {
      for (let x = 0; x < world.width; x++) {
        const top = world.topY(x, z, false);            // highest non-water block
        const surface = world.topY(x, z, true);         // including water
        const px = x * tileSize;
        const py = z * tileSize;
        if (top < 0) continue;
        const id = world.get(x, top, z);
        bakedContext.drawImage(textures[blockType(id).top], px, py, tileSize, tileSize);
        // Height shading: higher ground a little brighter, lower a little darker.
        const brightness = (top / world.height) - 0.35;
        bakedContext.fillStyle = brightness > 0 ? "rgba(255,250,235," + brightness * 0.35 + ")" : "rgba(10,20,40," + -brightness * 0.6 + ")";
        bakedContext.fillRect(px, py, tileSize, tileSize);
        // Shadow: if the block to the north-west (toward our pretend sun) is taller.
        const shadowHeight = Math.max(world.topY(x - 1, z, false), world.topY(x, z - 1, false), world.topY(x - 1, z - 1, false));
        if (shadowHeight > top) {
          bakedContext.fillStyle = "rgba(10,15,35," + Math.min(0.45, (shadowHeight - top) * 0.12) + ")";
          bakedContext.fillRect(px, py, tileSize, tileSize);
        }
        // Water on top: deeper water is more opaque.
        if (world.get(x, surface, z) === BLOCK.WATER) {
          const waterDepth = surface - top;
          bakedContext.globalAlpha = Math.min(0.92, 0.35 + waterDepth * 0.12);
          bakedContext.drawImage(textures.water, px, py, tileSize, tileSize);
          bakedContext.globalAlpha = 1;
        }
      }
    }
    bakedVersion = world.version;
  }

  // player: { x, z, yaw }. Keeps the player in the middle; time animates nothing yet.
  function render(player) {
    if (world.version !== bakedVersion) bake();
    const width = canvas.width;
    const height = canvas.height;
    context.imageSmoothingEnabled = false;
    context.fillStyle = "#2f6aa8";
    context.fillRect(0, 0, width, height);
    // Camera: the top-left corner of the screen, in baked-canvas pixels.
    const cameraX = Math.round(player.x * tileSize - width / 2);
    const cameraY = Math.round(player.z * tileSize - height / 2);
    context.drawImage(baked, -cameraX, -cameraY);
    for (const prop of world.props) {
      if (prop.hidden) continue;
      drawPropIcon(context, prop, prop.x * tileSize - cameraX, prop.z * tileSize - cameraY, tileSize);
    }
    drawCharacterIcon(context, width / 2, height / 2, tileSize * 0.9, player.yaw);
  }

  return { canvas, render, bake, tileSize };
}

// Small round markers for props (coins, crystals...). Games can draw their own instead.
export function drawPropIcon(context, prop, x, y, size) {
  context.fillStyle = "rgba(0,0,0,0.25)";
  context.beginPath();
  context.ellipse(x + 2, y + 3, size * 0.32, size * 0.2, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = prop.kind === "crystal" ? "#79e0ff" : "#ffcf40";
  context.beginPath();
  context.arc(x, y, size * 0.3, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(90,50,0,0.6)";
  context.lineWidth = 1.5;
  context.stroke();
}
