// Game Code Example 32: First-person controls in 3D
// WHAT: Click the view to capture the mouse, then walk the island like a first-person
//       game: mouse to look, WASD to walk, Space to jump. Esc frees the mouse.
// WHY:  Pointer lock hides the cursor and reports raw mouse movement, so you can turn
//       forever. Movement is relative to where you face (yaw), but only along the
//       ground, so looking up never makes you fly. The walker handles collisions.
// TRY:  Add sprinting: while Shift is down, set player.speed to 8.

import { createGame } from "kindling/game.js";
import { createWorldRenderer } from "kindling/3d/world-renderer.js";
import { createFirstPersonCamera } from "kindling/3d/camera3d.js";
import { createVoxelWorld } from "kindling/world/voxel-world.js";
import { generateIsland } from "kindling/world/generate.js";
import { createWalker, updateWalker, wishFromYaw } from "kindling/world/walker.js";

const game = createGame({ webgl: true, width: 640, height: 360,
  actions: { forward: ["KeyW", "ArrowUp"], back: ["KeyS", "ArrowDown"], left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"], jump: ["Space"] } });
const world = createVoxelWorld(64, 40, 64);
const island = generateIsland(world, { seed: 12 });
const renderer = createWorldRenderer(game.screen, { timeOfDay: 0.45 });
renderer.setWorld(world);
renderer.setOcean(island.seaLevel);
const camera = createFirstPersonCamera({ fieldOfView: 1.2, far: 500 });
const player = createWalker(island.spawn);
let pitch = 0;
game.canvas.addEventListener("click", () => game.input.mouse.lock());

game.scenes.add("walk", {
  update(game, stepSeconds) {
    const mouse = game.input.mouse;
    if (mouse.isLocked()) {
      player.yaw -= mouse.movement().x * 0.0025;
      pitch = Math.max(-1.5, Math.min(1.5, pitch - mouse.movement().y * 0.0025));
    }
    wishFromYaw(player, game.actions.axis("back", "forward"), game.actions.axis("left", "right"));
    player.wantsJump = game.actions.isDown("jump");
    updateWalker(world, player, stepSeconds);
  },
  render(game) {
    camera.position = { x: player.x, y: player.y + 1.6, z: player.z };   // eyes, not feet
    camera.yaw = player.yaw;
    camera.pitch = pitch;
    renderer.render(camera, game.time.elapsed);
  },
});

game.start("walk");
