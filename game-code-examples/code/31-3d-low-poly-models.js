// Game Code Example 31: Low-poly models from code
// WHAT: A little diorama made of code-built models: pine trees, round trees, rocks,
//       crystals, and the blocky character walking in a circle with swinging limbs.
// WHY:  A model is a list of colored triangles. createModelBuilder adds boxes, cones,
//       cylinders and lumpy rocks; flat shading (one normal per triangle) gives the clean
//       faceted look. createCharacter animates limbs by rotating each around its pivot.
// TRY:  Build your own prop: builder.box(...) a table, builder.cone(...) a party hat.

import { createGame } from "kindling/game.js";
import { createWorldRenderer } from "kindling/3d/world-renderer.js";
import { createOrbitCamera } from "kindling/3d/camera3d.js";
import { createModelBuilder, pineTree, roundTree, rockModel, crystalModel } from "kindling/3d/lowpoly.js";
import { createCharacter } from "kindling/3d/character.js";
import { createVoxelWorld } from "kindling/world/voxel-world.js";
import { generateFlat } from "kindling/world/generate.js";
import * as mat4 from "kindling/math/mat4.js";

const game = createGame({ webgl: true, width: 640, height: 360 });
const world = createVoxelWorld(24, 4, 24);
generateFlat(world, 2);                                     // a grass floor to stand on
const renderer = createWorldRenderer(game.screen, { timeOfDay: 0.62, shadowRadius: 16 });
renderer.setWorld(world);
const camera = createOrbitCamera({ target: { x: 12, y: 2.5, z: 12 }, distance: 13, pitch: 0.45, far: 300 });

const pine = renderer.createModel(pineTree(3.5));
const round = renderer.createModel(roundTree(3));
const rock = renderer.createModel(rockModel(7, 0.7));
const crystal = renderer.createModel(crystalModel());
// A model of our own: a little wooden bench.
const bench = createModelBuilder();
bench.box(0, 0.45, 0, 1.6, 0.12, 0.5, [0.7, 0.5, 0.3]);
bench.box(-0.65, 0.2, 0, 0.12, 0.4, 0.4, [0.5, 0.34, 0.2]);
bench.box(0.65, 0.2, 0, 0.12, 0.4, 0.4, [0.5, 0.34, 0.2]);
const benchMesh = renderer.createModel(bench.data());
const character = createCharacter(renderer, { shirt: [0.9, 0.3, 0.4] });

game.scenes.add("diorama", {
  update(game) {
    if (game.input.mouse.isDown(0)) camera.rotate(game.input.mouse.movement().x, game.input.mouse.movement().y);
  },
  render(game) {
    const time = game.time.elapsed;
    const at = (x, z) => mat4.translation(x, 2, z);
    renderer.queueModel(pine, at(8, 9));
    renderer.queueModel(pine, at(15.5, 8));
    renderer.queueModel(round, at(9, 15.5));
    renderer.queueModel(rock, at(15, 15));
    renderer.queueModel(benchMesh, mat4.rotateY(at(12, 8.5), 0.2));
    renderer.queueModel(crystal, mat4.rotateY(mat4.translation(12, 3.2 + Math.sin(time * 2) * 0.15, 12), time));
    // Walk in a circle: position on the circle, facing along it.
    const angle = time * 0.6;
    const feet = { x: 12 + Math.cos(angle) * 3, y: 2, z: 12 + Math.sin(angle) * 3 };
    character.queue(feet, Math.PI - angle, time * 8);   // face along the circle
    renderer.render(camera, time);
  },
});

game.start("diorama");
