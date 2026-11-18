// Game Code Example 26: An isometric (2.5D) world
// WHAT: Build a small block world in code and show it as an isometric diorama. Walk
//       with WASD; press B to drop a brick block where you stand, then jump on it.
// WHY:  Isometric views look 3D but are drawn with 2D images. createIsoView does the
//       projection and back-to-front drawing; your code only edits the world.
//       Changing the world bumps world.version, and the view repaints itself.
// TRY:  Change the world size, or build a tower with world.fill(x1, y1, z1, x2, y2, z2, BLOCK.STONE).

import { createVoxelWorld } from "kindling/world/voxel-world.js";
import { BLOCK } from "kindling/world/blocks.js";
import { createWalker, updateWalker } from "kindling/world/walker.js";
import { createIsoView } from "kindling/views/iso-view.js";
import { createKeyboard } from "kindling/input/keyboard.js";
import { createLoop } from "kindling/core/loop.js";

// A 16 x 8 x 16 world: grass floor, a pond, a little wall and a tree.
const world = createVoxelWorld(16, 8, 16);
world.fill(0, 0, 0, 15, 0, 15, BLOCK.DIRT);
world.fill(0, 1, 0, 15, 1, 15, BLOCK.GRASS);
world.fill(9, 1, 9, 12, 1, 12, BLOCK.WATER);
world.fill(3, 2, 10, 7, 3, 10, BLOCK.BRICK);
world.fill(12, 2, 3, 12, 4, 3, BLOCK.LOG);
world.fill(11, 5, 2, 13, 6, 4, BLOCK.LEAVES);
world.set(5, 4, 10, BLOCK.LANTERN);

// The canvas: this example makes its own instead of using createGame.
const canvas = document.querySelector("#game");
canvas.width = 640;
canvas.height = 360;
canvas.style.cssText = "width:100%;max-width:960px;image-rendering:pixelated;background:#9ccbf0";
const view = createIsoView(canvas, world, { tileWidth: 32 });
const player = createWalker({ x: 3.5, y: 2, z: 3.5 });
const keyboard = createKeyboard();

function update(stepSeconds) {
  const right = (keyboard.isDown("KeyD") ? 1 : 0) - (keyboard.isDown("KeyA") ? 1 : 0);
  const down = (keyboard.isDown("KeyS") ? 1 : 0) - (keyboard.isDown("KeyW") ? 1 : 0);
  // Screen directions -> world directions (screen "up" is north-west in isometric).
  player.wishX = (right + down) * Math.SQRT1_2;
  player.wishZ = (down - right) * Math.SQRT1_2;
  player.wantsJump = keyboard.isDown("Space");
  if (keyboard.wasPressed("KeyB")) {
    world.set(player.x, player.y, player.z, BLOCK.BRICK);
    player.y += 1;                       // stand on top of the new block
  }
  updateWalker(world, player, stepSeconds);
  keyboard.endStep();
}

createLoop({ update, render: () => view.render(player, performance.now() / 1000, 1.5) }).start();
