// Game Code Example 30: A 3D block world with shadows and fog
// WHAT: Generates an island and draws it with the stylized renderer: textured blocks,
//       sun shadows, ambient occlusion, fog, a sky with clouds, and a sea to the horizon.
//       Drag to orbit, mouse wheel to zoom.
// WHY:  createWorldRenderer is Kindling's 3D graphics engine. Give it a world and a
//       camera; it turns blocks into chunk meshes (only the faces you can see) and runs
//       the render pipeline: shadow pass, sky, blocks, models, water.
// TRY:  Change the seed. Set renderer.settings.shadows = false and compare.

import { createGame } from "kindling/game.js";
import { createWorldRenderer } from "kindling/3d/world-renderer.js";
import { createOrbitCamera } from "kindling/3d/camera3d.js";
import { createVoxelWorld } from "kindling/world/voxel-world.js";
import { generateIsland } from "kindling/world/generate.js";

const game = createGame({ webgl: true, width: 640, height: 360 });
const world = createVoxelWorld(64, 40, 64);
const island = generateIsland(world, { seed: 5 });
const renderer = createWorldRenderer(game.screen, { timeOfDay: 0.36, shadowRadius: 48 });
renderer.setWorld(world);
renderer.setOcean(island.seaLevel);
const camera = createOrbitCamera({ target: { x: 32, y: 16, z: 32 }, distance: 55, pitch: 0.55, yaw: 0.8, far: 600 });

game.scenes.add("view", {
  update(game, stepSeconds) {
    const mouse = game.input.mouse;
    if (mouse.isDown(0)) camera.rotate(mouse.movement().x, mouse.movement().y);
    else camera.yaw += 0.05 * stepSeconds;           // a slow turntable when idle
    camera.distance = Math.max(10, Math.min(120, camera.distance + mouse.wheel() * 3));
  },
  render(game) {
    renderer.render(camera, game.time.elapsed);
  },
});

game.start("view");
