// engine/3d/voxel-mesh.js
// WHAT: Turns a block world (world/voxel-world.js) into triangles the graphics card
//       can draw, one "chunk" (a 16 x 16 column of the world) at a time. Each corner
//       carries its texture layer, an ambient occlusion value and a sky-light value.
// WHY:  Drawing 100,000 cubes one by one is far too slow. Instead we only emit the
//       faces you could ever see: a face between two solid blocks is hidden, so it
//       is skipped. That one rule ("face culling") removes over 90% of the work.
//       Ambient occlusion (AO) darkens corners where blocks meet. It is the single
//       cheapest trick that makes blocky worlds look solid instead of flat.
// DOC:  docs/modules/world.md (section "From blocks to triangles")   VIZ: viz/15-voxel-lighting/
//
// Pure data in, pure data out (no WebGL here), so tests/checks can count faces in Node.

import { BLOCK, blockType, isTransparent, textureLayer } from "../world/blocks.js";

export const CHUNK_SIZE = 16;
const WATER_DROP = 0.12;   // water surface sits a little below the block top

// The 6 faces of a cube. n = outward normal; u and v span the face with u x v = n,
// so corners listed as (u, v) = (-,-) (+,-) (+,+) (-,+) are counter-clockwise from outside.
const FACES = [
  { name: "side", n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { name: "side", n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { name: "top", n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { name: "bottom", n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { name: "side", n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { name: "side", n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
];
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

// Does this block cast ambient occlusion on its neighbors? (Water and air don't.)
function occludes(id) {
  return id !== BLOCK.AIR && !isTransparent(id);
}

// Classic voxel AO for one corner: look at the two blocks beside it and the one
// diagonally across. 0 blockers -> 1.0 (open), both sides blocked -> darkest.
export function cornerOcclusion(side1, side2, corner) {
  if (side1 && side2) return 0;
  return (3 - (side1 + side2 + corner)) / 3;
}

// Should we draw the face of block `id` that touches block `neighbor`?
function faceVisible(id, neighbor) {
  if (neighbor === BLOCK.AIR) return true;
  if (blockType(id).liquid) return false;          // water next to anything: hide (no inner walls)
  return isTransparent(neighbor);                  // solid next to water: draw, it shows through
}

// Build mesh data for the chunk whose corner is (chunkX * 16, 0, chunkZ * 16).
// Returns { solid, water }: two mesh-data objects for createMesh (water is drawn
// later, see-through). skyTops[z][x] = the y of the highest light-blocking block.
export function buildChunkMesh(world, chunkX, chunkZ, skyTops = null) {
  const solid = { positions: [], normals: [], uvs: [], extras: [], indices: [] };
  const water = { positions: [], normals: [], uvs: [], extras: [], indices: [] };
  const startX = chunkX * CHUNK_SIZE;
  const startZ = chunkZ * CHUNK_SIZE;
  const endX = Math.min(startX + CHUNK_SIZE, world.width);
  const endZ = Math.min(startZ + CHUNK_SIZE, world.depth);
  const get = world.get;

  for (let y = 0; y < world.height; y++) {
    for (let z = startZ; z < endZ; z++) {
      for (let x = startX; x < endX; x++) {
        const id = get(x, y, z);
        if (id === BLOCK.AIR) continue;
        const type = blockType(id);
        const target = type.liquid ? water : solid;
        for (const face of FACES) {
          const nx = x + face.n[0];
          const ny = y + face.n[1];
          const nz = z + face.n[2];
          const neighbor = get(nx, ny, nz);
          if (!faceVisible(id, neighbor)) continue;
          if (type.liquid && face.name !== "top" && neighbor !== BLOCK.AIR) continue;
          // Sky light: is there open sky above the block this face looks into?
          let sky = 1;
          if (skyTops && skyTops[nz] && skyTops[nz][nx] !== undefined && ny <= skyTops[nz][nx]) sky = 0.45;
          addFace(target, x, y, z, face, textureLayer(id, face.name), sky, type, get);
        }
      }
    }
  }
  return { solid, water };
}

function addFace(target, x, y, z, face, layer, sky, type, get) {
  const start = target.positions.length / 3;
  const occlusion = [];
  const top = type.liquid && face.name === "top" ? 1 - WATER_DROP : 1;
  for (const [uSign, vSign] of CORNERS) {
    const corner = [];
    for (let axis = 0; axis < 3; axis++) {
      // Block center + half a step along the normal, u and v.
      corner.push(0.5 + face.n[axis] * 0.5 + face.u[axis] * uSign * 0.5 + face.v[axis] * vSign * 0.5);
    }
    if (corner[1] === 1) corner[1] = top;
    target.positions.push(x + corner[0], y + corner[1], z + corner[2]);
    target.normals.push(face.n[0], face.n[1], face.n[2]);
    // Texture: u left to right, v top to bottom (row 0 of the painted texture is its top).
    target.uvs.push((uSign + 1) / 2, 1 - (vSign + 1) / 2);

    // AO: the three blocks touching this corner, in the layer just outside the face.
    const outX = x + face.n[0];
    const outY = y + face.n[1];
    const outZ = z + face.n[2];
    const side1 = occludes(get(outX + face.u[0] * uSign, outY + face.u[1] * uSign, outZ + face.u[2] * uSign)) ? 1 : 0;
    const side2 = occludes(get(outX + face.v[0] * vSign, outY + face.v[1] * vSign, outZ + face.v[2] * vSign)) ? 1 : 0;
    const across = occludes(get(
      outX + face.u[0] * uSign + face.v[0] * vSign,
      outY + face.u[1] * uSign + face.v[1] * vSign,
      outZ + face.u[2] * uSign + face.v[2] * vSign,
    )) ? 1 : 0;
    const ao = type.liquid ? 1 : cornerOcclusion(side1, side2, across);
    occlusion.push(ao);
    target.extras.push(layer, ao, sky, type.glow || 0);
  }
  // Two triangles per face. Pick the diagonal that joins the two BRIGHTER corners,
  // otherwise the shading stretches into an ugly "X" (a famous voxel AO fix).
  if (occlusion[0] + occlusion[2] >= occlusion[1] + occlusion[3]) {
    target.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  } else {
    target.indices.push(start + 1, start + 2, start + 3, start + 1, start + 3, start);
  }
}

// For each column, the y of the highest block that blocks the sky (water doesn't).
// Faces at or below it are "indoors or under a tree", so ambient light is dimmer.
export function computeSkyTops(world) {
  const tops = [];
  for (let z = 0; z < world.depth; z++) {
    const row = [];
    for (let x = 0; x < world.width; x++) row.push(world.topY(x, z, false));
    tops.push(row);
  }
  return tops;
}
