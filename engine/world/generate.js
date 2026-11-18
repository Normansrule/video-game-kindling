// engine/world/generate.js
// WHAT: Builds worlds from a seed: a round island with beaches, hills, snowy peaks,
//       trees, flowers and a little village; plus helpers to place one tree or house.
// WHY:  Procedural generation gives you a big, good-looking level in 30 lines and
//       a new one for every seed. The recipe is always the same:
//         1. noise -> a height for each column
//         2. height -> which blocks (sand by the sea, snow up high)
//         3. sprinkle details with a seeded random (trees, flowers, houses)
// DOC:  docs/modules/world.md (section "Generating an island")
//
// Usage:
//   const world = createVoxelWorld(64, 32, 64);
//   generateIsland(world, { seed: 3 });

import { BLOCK } from "./blocks.js";
import { createNoise } from "../math/noise.js";
import { createRandom } from "../math/random.js";

// A tree: a log trunk and a rounded blob of leaves. (x, y, z) is the ground block.
export function placeTree(world, x, y, z, random) {
  const trunk = 3 + random.int(0, 2);
  for (let i = 1; i <= trunk; i++) world.set(x, y + i, z, BLOCK.LOG);
  const top = y + trunk;
  for (let dy = -1; dy <= 2; dy++) {
    const radius = dy === 2 ? 1 : 2;
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        // Skip the far corners so the blob looks round, and leave the trunk alone.
        const corner = Math.abs(dx) === radius && Math.abs(dz) === radius;
        if (corner && (dy === -1 || dy === 2 || random.chance(0.6))) continue;
        if (world.get(x + dx, top + dy, z + dz) === BLOCK.AIR) world.set(x + dx, top + dy, z + dz, BLOCK.LEAVES);
      }
    }
  }
}

// A small house: plank walls, a door gap, a window, a sloped roof and a lantern.
// (x, y, z) is the north-west corner of the floor; size is 5 x 5 blocks.
export function placeHouse(world, x, y, z) {
  const size = 5;
  world.fill(x, y, z, x + size - 1, y, z + size - 1, BLOCK.PATH);           // floor
  world.fill(x, y + 1, z, x + size - 1, y + 3, z + size - 1, BLOCK.PLANKS); // walls
  world.fill(x + 1, y + 1, z + 1, x + size - 2, y + 3, z + size - 2, BLOCK.AIR); // hollow
  for (const [cx, cz] of [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]]) {
    world.fill(x + cx, y + 1, z + cz, x + cx, y + 3, z + cz, BLOCK.LOG);    // corner posts
  }
  world.fill(x + 2, y + 1, z + size - 1, x + 2, y + 2, z + size - 1, BLOCK.AIR); // door (south)
  world.set(x, y + 2, z + 2, BLOCK.AIR);                                     // window (west)
  // Roof: each layer one block narrower, like a pyramid.
  for (let layer = 0; layer < 3; layer++) {
    world.fill(x - 1 + layer, y + 4 + layer, z - 1 + layer, x + size - layer, y + 4 + layer, z + size - layer, BLOCK.ROOF);
  }
  world.set(x + 3, y + 2, z + size, BLOCK.LANTERN);                          // by the door
}

// options: seed, seaLevel (default 30% of the height), trees (0..1 density), village (true)
export function generateIsland(world, options = {}) {
  const seed = options.seed ?? 1;
  const noise = createNoise(seed);
  const random = createRandom(seed * 7919 + 1);
  const seaLevel = options.seaLevel ?? Math.floor(world.height * 0.3);
  const treeDensity = options.trees ?? 0.022;
  const centerX = world.width / 2;
  const centerZ = world.depth / 2;
  const radius = Math.min(world.width, world.depth) * 0.46;
  const heights = [];

  // 1 and 2: a height per column, then the blocks in that column.
  for (let z = 0; z < world.depth; z++) {
    heights.push([]);
    for (let x = 0; x < world.width; x++) {
      // Distance from the middle, 0 (center) to 1 (edge of the island).
      const edge = Math.hypot(x - centerX, z - centerZ) / radius;
      const falloff = 1 - edge * edge;                       // a dome
      const hills = noise.fbm2(x * 0.045, z * 0.045, 4);     // -1..1
      const ground = seaLevel - 3 + falloff * (world.height * 0.32) + hills * world.height * 0.22;
      const height = Math.max(1, Math.min(world.height - 6, Math.floor(ground)));
      heights[z].push(height);
      for (let y = 0; y < height; y++) {
        let id = BLOCK.STONE;
        const depthBelowTop = height - 1 - y;
        if (height <= seaLevel + 1) id = depthBelowTop < 3 ? BLOCK.SAND : BLOCK.STONE;
        else if (height > world.height * 0.68) id = depthBelowTop === 0 ? BLOCK.SNOW : BLOCK.STONE;
        else if (height > world.height * 0.6) id = BLOCK.STONE;
        else if (depthBelowTop === 0) id = BLOCK.GRASS;
        else if (depthBelowTop < 3) id = BLOCK.DIRT;
        world.set(x, y, z, id);
      }
      // Fill everything below sea level with water.
      for (let y = height; y < seaLevel; y++) world.set(x, y, z, BLOCK.WATER);
    }
  }

  // 3a: a village on the flattest grassy spot near the middle.
  const houses = [];
  if (options.village !== false) {
    const spots = [[-9, -4], [2, -9], [3, 3], [-7, 6]];
    for (const [offsetX, offsetZ] of spots) {
      const hx = Math.floor(centerX + offsetX);
      const hz = Math.floor(centerZ + offsetZ);
      const floor = heights[hz]?.[hx];
      if (floor === undefined || floor <= seaLevel + 1 || floor > world.height * 0.58) continue;
      // Level the ground under the house (5 x 5 plus a 1 block border).
      for (let z = hz - 1; z <= hz + 5; z++) {
        for (let x = hx - 1; x <= hx + 5; x++) {
          for (let y = floor; y < world.height; y++) world.set(x, y, z, BLOCK.AIR);
          for (let y = Math.max(0, floor - 3); y < floor; y++) world.set(x, y, z, y === floor - 1 ? BLOCK.GRASS : BLOCK.DIRT);
          if (heights[z]) heights[z][x] = floor;
        }
      }
      placeHouse(world, hx, floor - 1, hz);
      houses.push({ x: hx, y: floor, z: hz });
    }
  }

  // 3b: trees and flowers on grass, not too close to houses.
  for (let z = 2; z < world.depth - 2; z++) {
    for (let x = 2; x < world.width - 2; x++) {
      const top = world.topY(x, z);
      if (world.get(x, top, z) !== BLOCK.GRASS) continue;
      const nearHouse = houses.some((house) => x > house.x - 3 && x < house.x + 8 && z > house.z - 3 && z < house.z + 8);
      if (!nearHouse && random.chance(treeDensity)) placeTree(world, x, top, z, random);
      else if (random.chance(0.06)) world.set(x, top, z, BLOCK.FLOWERS);
    }
  }

  // Start on open ground near the first house's door, facing the village.
  const near = houses.length ? { x: houses[0].x + 2, z: houses[0].z + 9 } : { x: centerX, z: centerZ };
  const spawn = findOpenSpot(world, near.x, near.z, seaLevel);
  spawn.yaw = Math.atan2(-(centerX - spawn.x), -(centerZ - spawn.z));
  world.version = world.version + 1;
  return { seaLevel, houses, spawn, heights };
}

const NATURAL_GROUND = [BLOCK.GRASS, BLOCK.FLOWERS, BLOCK.SAND, BLOCK.PATH, BLOCK.SNOW, BLOCK.DIRT];

// Search outward from (startX, startZ) for open, nearly flat, dry ground: a 5 x 5 patch
// where nothing is higher than the middle. Good for spawn points and for placing things.
export function findOpenSpot(world, startX, startZ, seaLevel = 0) {
  for (let radius = 0; radius < Math.max(world.width, world.depth) / 2; radius++) {
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;   // only the ring
        const x = Math.floor(startX + dx);
        const z = Math.floor(startZ + dz);
        const ground = world.groundHeight(x, z);
        if (ground <= seaLevel + 1) continue;
        if (!NATURAL_GROUND.includes(world.get(x, ground - 1, z))) continue;   // not on a roof
        // Neighbors may be one block lower, never higher (nothing to bump into).
        let open = true;
        for (let oz = -2; oz <= 2 && open; oz++) {
          for (let ox = -2; ox <= 2 && open; ox++) {
            const neighbor = world.groundHeight(x + ox, z + oz);
            if (neighbor > ground || neighbor < ground - 1) open = false;
          }
        }
        if (open) return { x: x + 0.5, y: ground + 0.01, z: z + 0.5 };
      }
    }
  }
  return { x: startX, y: world.groundHeight(startX, startZ) + 0.01, z: startZ };
}

// A flat test world: grass floor, a few walls. Good for examples and unit checks.
export function generateFlat(world, groundHeight = 2) {
  world.fill(0, 0, 0, world.width - 1, groundHeight - 2, world.depth - 1, BLOCK.DIRT);
  world.fill(0, groundHeight - 1, 0, world.width - 1, groundHeight - 1, world.depth - 1, BLOCK.GRASS);
  return { spawn: { x: world.width / 2, y: groundHeight, z: world.depth / 2 } };
}
