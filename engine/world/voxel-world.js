// engine/world/voxel-world.js
// WHAT: A world made of blocks: a width x height x depth box of block ids, stored in
//       one flat Uint8Array. Get and set blocks, find the ground under a point, and
//       ask "has anything changed since I last drew?".
// WHY:  This is the one piece of data every view draws. The same world can be shown
//       as a 2D map, an isometric diorama, a raycaster corridor or full 3D, because
//       views only READ it. Your game logic edits it; the views catch up.
//       (Separating the world from how it is drawn is the "model / view" idea.)
// DOC:  docs/modules/world.md   VIZ: viz/14-world-modes/
//
// Axes: x = east, y = UP, z = south. Block (x, y, z) fills the cube from
//       (x, y, z) to (x + 1, y + 1, z + 1) in world units (1 unit = 1 meter).

import { BLOCK, isSolid } from "./blocks.js";

export function createVoxelWorld(width, height, depth) {
  // One number per block. Index = x + z * width + y * width * depth
  // (a whole horizontal layer, then the next layer up).
  const blocks = new Uint8Array(width * height * depth);
  const world = {
    width,
    height,
    depth,
    blocks,
    // Goes up by one on every change. Views compare it to the number they last drew.
    version: 0,
    // Extra things that live in the world but aren't blocks: { kind, x, y, z }.
    // Views draw them as sprites, billboards or models. Games can add their own kinds.
    props: [],
  };

  function inside(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < width && y < height && z < depth;
  }

  function indexOf(x, y, z) {
    return x + z * width + y * width * depth;
  }

  // Outside the world is air, so edges are drawn and nothing crashes.
  world.get = function get(x, y, z) {
    x = Math.floor(x);
    y = Math.floor(y);
    z = Math.floor(z);
    if (!inside(x, y, z)) return BLOCK.AIR;
    return blocks[indexOf(x, y, z)];
  };

  world.set = function set(x, y, z, id) {
    x = Math.floor(x);
    y = Math.floor(y);
    z = Math.floor(z);
    if (!inside(x, y, z)) return false;
    const index = indexOf(x, y, z);
    if (blocks[index] === id) return false;
    blocks[index] = id;
    world.version = world.version + 1;
    for (const listener of listeners) listener(x, y, z, id);
    return true;
  };

  // Call listener(x, y, z, id) after every change. The 3D view uses this to rebuild
  // only the chunk you edited. Returns a function that stops listening.
  const listeners = [];
  world.onChange = function onChange(listener) {
    listeners.push(listener);
    return () => listeners.splice(listeners.indexOf(listener), 1);
  };

  world.inside = inside;

  // Fill a box of blocks (inclusive corners). Handy for floors, walls and houses.
  world.fill = function fill(x1, y1, z1, x2, y2, z2, id) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z++) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) world.set(x, y, z, id);
      }
    }
  };

  // The y of the highest non-air block in column (x, z), or -1 if the column is empty.
  // includeWater false skips water, so you get the sea floor.
  world.topY = function topY(x, z, includeWater = true) {
    for (let y = height - 1; y >= 0; y--) {
      const id = world.get(x, y, z);
      if (id === BLOCK.AIR) continue;
      if (!includeWater && id === BLOCK.WATER) continue;
      return y;
    }
    return -1;
  };

  // The height you would stand at in column (x, z): the top of the highest solid block.
  world.groundHeight = function groundHeight(x, z) {
    for (let y = height - 1; y >= 0; y--) {
      if (isSolid(world.get(x, y, z))) return y + 1;
    }
    return 0;
  };

  world.isSolidAt = function isSolidAt(x, y, z) {
    return isSolid(world.get(x, y, z));
  };

  // A copy you can save: plain numbers, ready for JSON or localStorage.
  world.toJSON = function toJSON() {
    return { width, height, depth, blocks: Array.from(blocks), props: world.props };
  };

  return world;
}

// Rebuild a world from world.toJSON() output.
export function voxelWorldFromJSON(saved) {
  const world = createVoxelWorld(saved.width, saved.height, saved.depth);
  world.blocks.set(saved.blocks);
  world.props = saved.props || [];
  world.version = 1;
  return world;
}

// Step through every block a ray passes, in order (the "DDA" grid walk, in 3D).
// Returns { x, y, z, id, distance, normal } for the first solid block, or null.
// normal says which face was hit, so "place a block" can go on that side.
export function raycastVoxels(world, origin, direction, maxDistance = 8) {
  let x = Math.floor(origin.x);
  let y = Math.floor(origin.y);
  let z = Math.floor(origin.z);
  const stepX = direction.x > 0 ? 1 : -1;
  const stepY = direction.y > 0 ? 1 : -1;
  const stepZ = direction.z > 0 ? 1 : -1;
  // How far along the ray to cross one whole block on each axis.
  const crossX = Math.abs(1 / direction.x);
  const crossY = Math.abs(1 / direction.y);
  const crossZ = Math.abs(1 / direction.z);
  // How far along the ray to the FIRST block border on each axis.
  let nextX = (direction.x > 0 ? x + 1 - origin.x : origin.x - x) * crossX;
  let nextY = (direction.y > 0 ? y + 1 - origin.y : origin.y - y) * crossY;
  let nextZ = (direction.z > 0 ? z + 1 - origin.z : origin.z - z) * crossZ;
  let distance = 0;
  let normal = { x: 0, y: 0, z: 0 };
  while (distance <= maxDistance) {
    const id = world.get(x, y, z);
    if (id !== BLOCK.AIR && id !== BLOCK.WATER) return { x, y, z, id, distance, normal };
    // Step into whichever neighbor's border is nearest.
    if (nextX < nextY && nextX < nextZ) {
      x += stepX; distance = nextX; nextX += crossX; normal = { x: -stepX, y: 0, z: 0 };
    } else if (nextY < nextZ) {
      y += stepY; distance = nextY; nextY += crossY; normal = { x: 0, y: -stepY, z: 0 };
    } else {
      z += stepZ; distance = nextZ; nextZ += crossZ; normal = { x: 0, y: 0, z: -stepZ };
    }
  }
  return null;
}
