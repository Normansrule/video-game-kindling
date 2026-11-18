// Game Code Example 33: Day, night, and lanterns
// WHAT: Time flies: a full day every 30 seconds. Watch the sun set, the sky turn
//       orange then dark, stars appear and lanterns light the village. Hold Space to
//       fast-forward.
// WHY:  renderer.settings.timeOfDay (0 = midnight, 0.5 = noon) drives the sun angle
//       and every light color through a small table of key moments (see 3d/sky.js).
//       Lantern blocks become point lights at night automatically.
// TRY:  Freeze time at 0.75 for a permanent sunset, or edit the colors in sky.js.

import { createGame } from "kindling/game.js";
import { createWorldRenderer } from "kindling/3d/world-renderer.js";
import { createOrbitCamera } from "kindling/3d/camera3d.js";
import { createVoxelWorld } from "kindling/world/voxel-world.js";
import { generateIsland } from "kindling/world/generate.js";

const game = createGame({ webgl: true, width: 640, height: 360, actions: { fast: ["Space"] } });
const world = createVoxelWorld(64, 40, 64);
const island = generateIsland(world, { seed: 3 });
const renderer = createWorldRenderer(game.screen, { timeOfDay: 0.6, shadowRadius: 30 });
renderer.setWorld(world);
renderer.setOcean(island.seaLevel);
const house = island.houses[0] || island.spawn;
const camera = createOrbitCamera({ target: { x: house.x + 2, y: house.y + 2, z: house.z + 2 }, distance: 22, pitch: 0.4, yaw: 0.6, far: 600 });

game.scenes.add("time", {
  update(game, stepSeconds) {
    const speed = game.actions.isDown("fast") ? 8 : 1;
    renderer.settings.timeOfDay = (renderer.settings.timeOfDay + (stepSeconds * speed) / 30) % 1;
    camera.yaw += 0.03 * stepSeconds;
  },
  render(game) {
    renderer.render(camera, game.time.elapsed);
  },
});

game.start("time");
