// viz/14-world-modes/main.js
// WHAT: Four world views (2D map, isometric, raycaster, 3D) of ONE world, side by side,
//       with an explorer who walks around by themselves and buttons that edit the world.
// WHY:  Seeing all four at once makes "the world is data, a view is a function" obvious.

import { createVoxelWorld } from "kindling/world/voxel-world.js";
import { generateIsland, placeTree } from "kindling/world/generate.js";
import { BLOCK } from "kindling/world/blocks.js";
import { createWalker, updateWalker, wishFromYaw } from "kindling/world/walker.js";
import { createWorldView } from "kindling/views/world-view.js";
import { createRandom } from "kindling/math/random.js";
import { createRunner, createControls } from "../kit.js";

const world = createVoxelWorld(40, 32, 40);
const island = generateIsland(world, { seed: 12, village: true });
const explorer = createWalker(island.spawn);
explorer.speed = 2.2;
explorer.walkCycle = 0;
const random = createRandom(4);

const views = ["2d", "iso", "raycast", "3d"].map((mode) => createWorldView({
  container: "#view-" + mode, world, mode, width: 480, height: 270, tileSize: 12,
  seaLevel: island.seaLevel, label: "The island drawn in " + mode + " mode",
}));

// The explorer: walk forward, turn away from water and walls.
let time = 0;
function dryAhead(yaw) {
  const x = explorer.x - Math.sin(yaw) * 2;
  const z = explorer.z - Math.cos(yaw) * 2;
  const ground = world.groundHeight(x, z);
  return x > 2 && z > 2 && x < world.width - 2 && z < world.depth - 2 && ground > island.seaLevel + 0.5 && ground - explorer.y < 1.5;
}
function tick(seconds) {
  if (seconds > 0) {
    time += seconds;
    explorer.yaw += Math.sin(time * 0.7) * 0.6 * seconds;
    if (!dryAhead(explorer.yaw)) explorer.yaw += (dryAhead(explorer.yaw + 0.8) ? 1 : -1) * 2.5 * seconds;
    const beforeX = explorer.x;
    const beforeZ = explorer.z;
    wishFromYaw(explorer, 1, 0);
    updateWalker(world, explorer, seconds);
    if (Math.hypot(explorer.x - beforeX, explorer.z - beforeZ) < explorer.speed * seconds * 0.3) explorer.yaw += 2.5 * seconds;
    explorer.walkCycle += seconds * 8;
  }
  for (const view of views) view.render(explorer, time);
  let solid = 0;
  // (Counting every block each frame is wasteful in a game; here it shows the data is live.)
  for (let y = 0; y < world.height; y += 1) for (let z = 0; z < world.depth; z += 1) for (let x = 0; x < world.width; x += 1) if (world.get(x, y, z) !== BLOCK.AIR) solid++;
  readout.textContent = "World: " + world.width + " × " + world.height + " × " + world.depth + " = " + (world.width * world.height * world.depth).toLocaleString() + " blocks (1 byte each), " + solid.toLocaleString() + " not air. Changes so far: " + world.version.toLocaleString() + ".";
}
const readout = document.getElementById("readout");

// A spot two blocks in front of the explorer.
function inFront() {
  return { x: Math.floor(explorer.x - Math.sin(explorer.yaw) * 2.5), z: Math.floor(explorer.z - Math.cos(explorer.yaw) * 2.5) };
}

const controls = createControls(document.getElementById("controls"));
const [playButton] = controls.addButtons([
  { label: "Pause", primary: true },
  { label: "Build a tower", onClick: () => { const { x, z } = inFront(); const base = world.groundHeight(x, z); world.fill(x, base, z, x, base + 5, z, BLOCK.BRICK); world.set(x, base + 6, z, BLOCK.LANTERN); } },
  { label: "Dig a hole", onClick: () => { const { x, z } = inFront(); const top = world.groundHeight(x, z); world.fill(x - 1, Math.max(1, top - 3), z - 1, x + 1, top + 2, z + 1, BLOCK.AIR); } },
  { label: "Plant a tree", onClick: () => { const { x, z } = inFront(); placeTree(world, x, world.groundHeight(x, z), z, random); } },
]);
controls.addSlider({ label: "Time of day (3D)", min: 0, max: 1, step: 0.01, value: 0.38, onChange: (value) => { if (views[3].renderer) views[3].renderer.settings.timeOfDay = value; } });
createRunner(tick, playButton);
