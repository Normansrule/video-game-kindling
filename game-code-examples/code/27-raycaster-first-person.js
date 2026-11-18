// Game Code Example 27: A raycaster (2.5D first person)
// WHAT: Walk through a small maze typed as text, Wolfenstein-style: W/S walk, A/D turn.
// WHY:  For every column of the screen, a ray walks the grid until it hits a wall;
//       closer walls are drawn taller. That is all the "3D" there is. Kindling's raycast
//       view adds textures, floor casting, fog and sprites (the coins).
// TRY:  Change the maze. Make walls out of BLOCK.STONE instead of BLOCK.BRICK.

import { createVoxelWorld } from "kindling/world/voxel-world.js";
import { BLOCK } from "kindling/world/blocks.js";
import { createWalker, updateWalker, wishFromYaw } from "kindling/world/walker.js";
import { createRaycastView } from "kindling/views/raycast-view.js";
import { createKeyboard } from "kindling/input/keyboard.js";
import { createLoop } from "kindling/core/loop.js";

const MAZE = [
  "##########",
  "#....#...#",
  "#.##.#.#.#",
  "#.#..c.#.#",
  "#.#.####.#",
  "#...#..c.#",
  "###.#.####",
  "#c....#..#",
  "#.###...c#",
  "##########",
];
// Turn the text into blocks: a floor everywhere, walls 2 blocks high, coins as props.
const world = createVoxelWorld(10, 4, 10);
world.fill(0, 0, 0, 9, 0, 9, BLOCK.PATH);
MAZE.forEach((row, z) => [...row].forEach((character, x) => {
  if (character === "#") world.fill(x, 1, z, x, 2, z, BLOCK.BRICK);
  if (character === "c") world.props.push({ kind: "coin", x: x + 0.5, y: 1, z: z + 0.5 });
}));

const canvas = document.querySelector("#game");
canvas.width = 640;
canvas.height = 360;
canvas.style.cssText = "width:100%;max-width:960px;image-rendering:pixelated";
const view = createRaycastView(canvas, world, { resolution: 320, fogDistance: 12 });
const player = createWalker({ x: 1.5, y: 1, z: 1.5, yaw: Math.PI });
const keyboard = createKeyboard();

function update(stepSeconds) {
  const forward = (keyboard.isDown("KeyW") || keyboard.isDown("ArrowUp") ? 1 : 0) - (keyboard.isDown("KeyS") || keyboard.isDown("ArrowDown") ? 1 : 0);
  const turn = (keyboard.isDown("KeyD") || keyboard.isDown("ArrowRight") ? 1 : 0) - (keyboard.isDown("KeyA") || keyboard.isDown("ArrowLeft") ? 1 : 0);
  player.yaw -= turn * 2.5 * stepSeconds;
  wishFromYaw(player, forward, 0);
  updateWalker(world, player, stepSeconds);
  for (const coin of world.props) if (!coin.hidden && Math.hypot(coin.x - player.x, coin.z - player.z) < 0.6) coin.hidden = true;
  keyboard.endStep();
}

createLoop({ update, render: () => view.render(player) }).start();
