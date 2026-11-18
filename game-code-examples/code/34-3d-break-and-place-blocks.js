// Game Code Example 34: Picking: break and place blocks with the mouse
// WHAT: Orbit view of a small world. Left-click a block to break it, right-click to
//       place a brick on the face you clicked. Hold Shift and drag to orbit.
// WHY:  "What is under the mouse?" = turn the 2D mouse point into a 3D ray (undo the
//       projection and view matrices), then walk the block grid along the ray until it
//       hits something (raycastVoxels). The hit's normal says which face you clicked.
// TRY:  Show which block is under the mouse by drawing a crystal model above it.

import { createGame } from "kindling/game.js";
import { createWorldRenderer } from "kindling/3d/world-renderer.js";
import { createOrbitCamera } from "kindling/3d/camera3d.js";
import { createVoxelWorld, raycastVoxels } from "kindling/world/voxel-world.js";
import { generateFlat } from "kindling/world/generate.js";
import { BLOCK } from "kindling/world/blocks.js";
import * as mat4 from "kindling/math/mat4.js";

const game = createGame({ webgl: true, width: 640, height: 360 });
const world = createVoxelWorld(16, 10, 16);
generateFlat(world, 3);
world.fill(6, 3, 6, 9, 5, 9, BLOCK.STONE);
const renderer = createWorldRenderer(game.screen, { timeOfDay: 0.4, shadowRadius: 14 });
renderer.setWorld(world);
const camera = createOrbitCamera({ target: { x: 8, y: 3, z: 8 }, distance: 18, pitch: 0.6, yaw: 0.7 });
game.canvas.addEventListener("contextmenu", (event) => event.preventDefault());

// Mouse position (game pixels) -> a ray from the camera into the world.
function mouseRay(mouse) {
  const ndcX = (mouse.position.x / game.width) * 2 - 1;          // -1 left .. +1 right
  const ndcY = 1 - (mouse.position.y / game.height) * 2;         // -1 bottom .. +1 top
  const inverse = mat4.invert(mat4.multiply(camera.projection(game.canvas.width / game.canvas.height), camera.view()));
  const near = mat4.transformPoint(inverse, { x: ndcX, y: ndcY, z: -1 });
  const far = mat4.transformPoint(inverse, { x: ndcX, y: ndcY, z: 1 });
  const length = Math.hypot(far.x - near.x, far.y - near.y, far.z - near.z);
  return { origin: near, direction: { x: (far.x - near.x) / length, y: (far.y - near.y) / length, z: (far.z - near.z) / length } };
}

game.scenes.add("build", {
  update(game) {
    const mouse = game.input.mouse;
    if (game.input.keyboard.isDown("ShiftLeft") && mouse.isDown(0)) { camera.rotate(mouse.movement().x, mouse.movement().y); return; }
    if (!mouse.wasPressed(0) && !mouse.wasPressed(2)) return;
    const ray = mouseRay(mouse);
    const hit = raycastVoxels(world, ray.origin, ray.direction, 60);
    if (!hit) return;
    if (mouse.wasPressed(0)) world.set(hit.x, hit.y, hit.z, BLOCK.AIR);
    else world.set(hit.x + hit.normal.x, hit.y + hit.normal.y, hit.z + hit.normal.z, BLOCK.BRICK);
  },
  render(game) {
    renderer.render(camera, game.time.elapsed);
  },
});

game.start("build");
