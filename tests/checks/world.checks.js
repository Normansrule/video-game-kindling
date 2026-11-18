// tests/checks/world.checks.js
// WHAT: Checks for Kindling 2's block worlds: noise, block types, painted textures,
//       the chunk mesher and its ambient occlusion, block picking, the walker, island
//       generation and the low-poly model builder.
// WHY:  These are pure data and math, so they run in Node too. The GPU side (shaders,
//       shadow maps) is checked by the smoke test, which renders every 3D page.
// DOC:  docs/modules/world.md, docs/modules/3d-stylized.md

import { expect, expectClose } from "./expect.js";
import { createNoise } from "../../engine/math/noise.js";
import { BLOCK, blockTypes, textureNames, textureLayer, isSolid } from "../../engine/world/blocks.js";
import { paintTexture, TEXTURE_SIZE } from "../../engine/world/textures.js";
import { createVoxelWorld, raycastVoxels, voxelWorldFromJSON } from "../../engine/world/voxel-world.js";
import { generateIsland } from "../../engine/world/generate.js";
import { createWalker, updateWalker, collides } from "../../engine/world/walker.js";
import { buildChunkMesh, cornerOcclusion } from "../../engine/3d/voxel-mesh.js";
import { pineTree, roundTree, rockModel, coinModel, crystalModel, blockyCharacter } from "../../engine/3d/lowpoly.js";

// A small world with a 2-block stone floor (the top of the floor is y = 2).
function floorWorld() {
  const world = createVoxelWorld(16, 12, 16);
  world.fill(0, 0, 0, 15, 1, 15, BLOCK.STONE);
  return world;
}

function stepWalker(world, walker, steps) {
  for (let i = 0; i < steps; i++) updateWalker(world, walker, 1 / 60);
}

// Every triangle's corner order (winding) must agree with its stored normal,
// or the back-face culling hides it and the model looks inside-out.
function windingMismatches(data) {
  const p = data.positions;
  const n = data.normals;
  let bad = 0;
  for (let i = 0; i < p.length; i += 9) {
    const e1 = [p[i + 3] - p[i], p[i + 4] - p[i + 1], p[i + 5] - p[i + 2]];
    const e2 = [p[i + 6] - p[i], p[i + 7] - p[i + 1], p[i + 8] - p[i + 2]];
    const cross = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const length = Math.hypot(cross[0], cross[1], cross[2]);
    if (length < 1e-9) continue;   // a degenerate sliver has no direction
    if (cross[0] * n[i] + cross[1] * n[i + 1] + cross[2] * n[i + 2] <= 0) bad++;
  }
  return bad;
}

export const worldChecks = [
  {
    name: "noise is the same for the same seed and different for another",
    run() {
      const a = createNoise(7);
      const b = createNoise(7);
      const c = createNoise(8);
      expect(a.noise2(3.3, 4.7) === b.noise2(3.3, 4.7), "same seed gave different values");
      expect(a.noise2(3.3, 4.7) !== c.noise2(3.3, 4.7), "different seeds gave the same value");
    },
  },
  {
    name: "noise stays between -1 and 1 and is smooth",
    run() {
      const noise = createNoise(3);
      for (let i = 0; i < 2000; i++) {
        const x = i * 0.173;
        const y = i * 0.091;
        const value = noise.fbm2(x, y, 4);
        expect(value >= -1 && value <= 1, "fbm2 out of range: " + value);
        expect(Math.abs(noise.noise2(x, y) - noise.noise2(x + 0.001, y)) < 0.02, "noise jumps between close points");
      }
    },
  },
  {
    name: "every block face has a texture layer, and air is not solid",
    run() {
      for (const type of blockTypes) {
        if (type.id === BLOCK.AIR) continue;
        for (const face of ["top", "side", "bottom"]) expect(textureLayer(type.id, face) >= 0, type.name + " " + face + " has no texture");
      }
      expect(!isSolid(BLOCK.AIR) && !isSolid(BLOCK.WATER) && isSolid(BLOCK.STONE), "solid flags are wrong");
    },
  },
  {
    name: "painted textures are 16 x 16, opaque and the same every time",
    run() {
      for (const name of textureNames) {
        const first = paintTexture(name);
        const second = paintTexture(name);
        expect(first.width === TEXTURE_SIZE && first.data.length === TEXTURE_SIZE * TEXTURE_SIZE * 4, name + " has the wrong size");
        expect(first.data.every((value, index) => value === second.data[index]), name + " is random between calls");
      }
      const stone = paintTexture("stone").data;
      for (let i = 3; i < stone.length; i += 4) expect(stone[i] === 255, "stone has see-through pixels");
    },
  },
  {
    name: "a lone block is meshed as 6 faces, two touching blocks as 10",
    run() {
      const world = createVoxelWorld(16, 8, 16);
      world.set(4, 4, 4, BLOCK.STONE);
      let mesh = buildChunkMesh(world, 0, 0).solid;
      expect(mesh.indices.length === 6 * 6, "expected 6 faces, got " + mesh.indices.length / 6);
      world.set(5, 4, 4, BLOCK.STONE);
      mesh = buildChunkMesh(world, 0, 0).solid;
      expect(mesh.indices.length === 10 * 6, "hidden faces were not culled: " + mesh.indices.length / 6 + " faces");
      expect(mesh.extras.length === (mesh.positions.length / 3) * 4, "every corner needs 4 extras");
    },
  },
  {
    name: "water goes in its own mesh and hides no faces of what is under it",
    run() {
      const world = createVoxelWorld(16, 8, 16);
      world.set(4, 3, 4, BLOCK.STONE);
      world.set(4, 4, 4, BLOCK.WATER);
      const { solid, water } = buildChunkMesh(world, 0, 0);
      expect(solid.indices.length === 6 * 6, "the stone under water should keep all 6 faces");
      expect(water.indices.length > 0, "water made no faces");
    },
  },
  {
    name: "ambient occlusion: open corners are bright, inside corners are dark",
    run() {
      expectClose(cornerOcclusion(0, 0, 0), 1, 1e-9, "open corner");
      expectClose(cornerOcclusion(1, 0, 0), 2 / 3, 1e-9, "one side");
      expectClose(cornerOcclusion(1, 1, 0), 0, 1e-9, "two sides");
      expectClose(cornerOcclusion(1, 1, 1), 0, 1e-9, "fully closed");
    },
  },
  {
    name: "raycastVoxels hits the first block and reports the face",
    run() {
      const world = createVoxelWorld(16, 8, 16);
      world.set(5, 2, 5, BLOCK.BRICK);
      const hit = raycastVoxels(world, { x: 5.5, y: 2.5, z: 0.5 }, { x: 0, y: 0, z: 1 }, 10);
      expect(hit && hit.x === 5 && hit.y === 2 && hit.z === 5, "missed the brick");
      expect(hit.normal.z === -1 && hit.normal.x === 0 && hit.normal.y === 0, "wrong face normal");
      expectClose(hit.distance, 4.5, 1e-6, "distance");
      expect(raycastVoxels(world, { x: 5.5, y: 2.5, z: 0.5 }, { x: 0, y: 0, z: 1 }, 3) === null, "hit beyond max distance");
    },
  },
  {
    name: "a world survives a save and load",
    run() {
      const world = floorWorld();
      world.set(3, 2, 3, BLOCK.LANTERN);
      const copy = voxelWorldFromJSON(JSON.parse(JSON.stringify(world.toJSON())));
      expect(copy.get(3, 2, 3) === BLOCK.LANTERN && copy.get(0, 0, 0) === BLOCK.STONE && copy.width === 16, "the copy differs");
    },
  },
  {
    name: "the walker lands on the floor and does not fall through",
    run() {
      const world = floorWorld();
      const walker = createWalker({ x: 8, y: 6, z: 8 });
      stepWalker(world, walker, 120);
      expect(walker.onGround, "never landed");
      expectClose(walker.y, 2, 1e-6, "standing height");
    },
  },
  {
    name: "the walker steps up one block but not two",
    run() {
      const world = floorWorld();
      world.fill(10, 2, 0, 15, 2, 15, BLOCK.STONE);          // a raised floor, one block up, from x = 10
      world.fill(13, 3, 0, 13, 4, 15, BLOCK.STONE);          // and a two-block wall on it at x = 13
      const walker = createWalker({ x: 8.5, y: 2, z: 8 });
      stepWalker(world, walker, 10);
      walker.wishX = 1;
      stepWalker(world, walker, 30);
      expect(walker.x > 10.3 && walker.y >= 3 - 1e-6, "did not step up: x " + walker.x.toFixed(2) + " y " + walker.y.toFixed(2));
      stepWalker(world, walker, 120);
      expect(walker.x < 13 - walker.radius + 1e-6, "walked through a two-block wall");
    },
  },
  {
    name: "islands are the same for the same seed and spawn on open dry land",
    run() {
      const a = createVoxelWorld(48, 32, 48);
      const b = createVoxelWorld(48, 32, 48);
      const islandA = generateIsland(a, { seed: 21 });
      generateIsland(b, { seed: 21 });
      expect(JSON.stringify(a.toJSON().blocks) === JSON.stringify(b.toJSON().blocks), "same seed, different island");
      const spawn = islandA.spawn;
      expect(spawn.y > islandA.seaLevel + 1, "spawn is in the sea");
      expect(!collides(a, createWalker(), spawn.x, spawn.y, spawn.z), "spawn is inside a block");
    },
  },
  {
    name: "low-poly models: every triangle faces the way its normal says",
    run() {
      const models = { pineTree: pineTree(), roundTree: roundTree(2), rock: rockModel(3), coin: coinModel(), crystal: crystalModel() };
      for (const [name, model] of Object.entries(models)) expect(windingMismatches(model) === 0, name + " has " + windingMismatches(model) + " inside-out triangles");
      for (const [name, part] of Object.entries(blockyCharacter())) {
        if (part && part.data) expect(windingMismatches(part.data) === 0, "character " + name + " has inside-out triangles");
      }
    },
  },
];
