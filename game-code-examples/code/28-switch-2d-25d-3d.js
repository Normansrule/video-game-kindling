// Game Code Example 28: One game, any view (2D, 2.5D or 3D)
// WHAT: A generated island you can walk around. Press 1 to 5 to switch between the
//       2D map, isometric, raycaster, 3D third-person and 3D first-person views.
// WHY:  The game state (world + player) knows nothing about drawing. createWorldView
//       draws it in whichever mode you choose, and can switch at any time.
//       Pick your game's look by changing ONE word: mode: "iso".
// TRY:  Start in "3d", and set view.renderer.settings.timeOfDay = 0.75 for a sunset.

import { createVoxelWorld } from "kindling/world/voxel-world.js";
import { generateIsland } from "kindling/world/generate.js";
import { createWalker, updateWalker, wishFromYaw } from "kindling/world/walker.js";
import { createWorldView, VIEW_MODES } from "kindling/views/world-view.js";
import { createKeyboard } from "kindling/input/keyboard.js";
import { createLoop } from "kindling/core/loop.js";

const world = createVoxelWorld(48, 32, 48);
const island = generateIsland(world, { seed: 8 });
const player = createWalker(island.spawn);
player.walkCycle = 0;

// The view needs a container element; it makes (and swaps) its own canvas inside.
document.querySelector("#game").remove();
const container = document.createElement("div");
container.style.cssText = "width:100%;max-width:960px";
document.body.prepend(container);
const view = createWorldView({ container, world, mode: "iso", seaLevel: island.seaLevel });
const keyboard = createKeyboard();

function update(stepSeconds) {
  const forward = (keyboard.isDown("KeyW") ? 1 : 0) - (keyboard.isDown("KeyS") ? 1 : 0);
  const side = (keyboard.isDown("KeyD") ? 1 : 0) - (keyboard.isDown("KeyA") ? 1 : 0);
  if (view.mode === "2d") { player.wishX = side; player.wishZ = -forward; }
  else if (view.mode === "iso") { player.wishX = (side - forward) * Math.SQRT1_2; player.wishZ = (-side - forward) * Math.SQRT1_2; }
  else { player.yaw -= side * 2.5 * stepSeconds; wishFromYaw(player, forward, 0); }
  if (view.mode === "2d" || view.mode === "iso") {
    if (player.wishX || player.wishZ) player.yaw = Math.atan2(-player.wishX, -player.wishZ);
  }
  player.wantsJump = keyboard.isDown("Space");
  updateWalker(world, player, stepSeconds);
  player.walkCycle = player.wishX || player.wishZ ? player.walkCycle + stepSeconds * 10 : 0;
  for (let key = 1; key <= VIEW_MODES.length; key++) {
    if (keyboard.wasPressed("Digit" + key)) view.setMode(VIEW_MODES[key - 1]);
  }
  keyboard.endStep();
}

let time = 0;
createLoop({ update(stepSeconds) { time += stepSeconds; update(stepSeconds); }, render: () => view.render(player, time) }).start();
