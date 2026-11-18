// engine/3d/collision3d.js
// WHAT: Box collision in 3D: do two boxes overlap, and "move a body, stop at walls
//       and floors" for a 3D character, plus a ray-versus-box test.
// WHY:  Most 3D jam games need exactly what 2D platformers need, one axis more.
//       The same trick works: move one axis at a time (x, then y, then z) and
//       push back out of anything you entered. No physics engine needed.
// DOC:  docs/modules/3d.md   (2D version: engine/2d/physics.js)
//
// A box is { x, y, z, width, height, depth } where x, y, z is the MINIMUM corner
// (the lowest, left-most, back-most point). In Kindling 3D, +y is up.
// AABB = axis-aligned bounding box: a box that is never rotated.

// True when two boxes share some space (touching faces do not count).
export function boxesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y &&
         a.z < b.z + b.depth && a.z + a.depth > b.z;
}

// True when a point is inside a box.
export function pointInBox(point, box) {
  return point.x >= box.x && point.x <= box.x + box.width &&
         point.y >= box.y && point.y <= box.y + box.height &&
         point.z >= box.z && point.z <= box.z + box.depth;
}

// The middle of a box (useful for drawing: meshes are usually centered).
export function boxCenter(box) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, z: box.z + box.depth / 2 };
}

// Make a box from its center and size, which is often how you think about level pieces.
export function boxFromCenter(x, y, z, width, height, depth) {
  return { x: x - width / 2, y: y - height / 2, z: z - depth / 2, width, height, depth };
}

// A 3D body: a box plus velocity. Units: meters and seconds.
export function createBody3D(options = {}) {
  return {
    x: options.x || 0,
    y: options.y || 0,
    z: options.z || 0,
    width: options.width || 0.8,
    height: options.height || 1.6,
    depth: options.depth || 0.8,
    velocityX: 0,
    velocityY: 0,
    velocityZ: 0,
    gravity: options.gravity === undefined ? 20 : options.gravity,   // m/s² pulling down
    maxFallSpeed: options.maxFallSpeed || 30,
    onGround: false,
  };
}

// Move a body by its velocity for one step, stopping at any box in `solids`.
// Sets body.onGround. Returns true if it hit anything.
export function moveAndCollide3D(body, stepSeconds, solids) {
  body.velocityY = Math.max(body.velocityY - body.gravity * stepSeconds, -body.maxFallSpeed);
  body.onGround = false;
  const hitX = moveAxis(body, "x", "width", "velocityX", body.velocityX * stepSeconds, solids);
  const hitY = moveAxis(body, "y", "height", "velocityY", body.velocityY * stepSeconds, solids);
  const hitZ = moveAxis(body, "z", "depth", "velocityZ", body.velocityZ * stepSeconds, solids);
  return hitX || hitY || hitZ;
}

function moveAxis(body, axis, size, velocity, distance, solids) {
  if (distance === 0) return false;
  body[axis] = body[axis] + distance;
  let hit = false;
  for (const solid of solids) {
    if (!boxesOverlap(body, solid)) continue;
    hit = true;
    if (distance > 0) {
      body[axis] = solid[axis] - body[size];       // moving up/right/forward: stop at its near face
    } else {
      body[axis] = solid[axis] + solid[size];      // moving down/left/back: stop at its far face
      if (axis === "y") body.onGround = true;      // landed on top of it
    }
    body[velocity] = 0;
  }
  return hit;
}

// Ray against box ("slab method"): returns the distance along the ray to the first hit,
// or null for a miss (the same as rayRect in engine/2d/collision.js). direction does not need to be length 1; distance is in its units.
export function rayBox(origin, direction, box) {
  let near = -Infinity;
  let far = Infinity;
  for (const [axis, size] of [["x", "width"], ["y", "height"], ["z", "depth"]]) {
    const low = box[axis];
    const high = box[axis] + box[size];
    if (direction[axis] === 0) {
      if (origin[axis] < low || origin[axis] > high) return null;   // parallel and outside
      continue;
    }
    let t1 = (low - origin[axis]) / direction[axis];
    let t2 = (high - origin[axis]) / direction[axis];
    if (t1 > t2) [t1, t2] = [t2, t1];
    near = Math.max(near, t1);
    far = Math.min(far, t2);
    if (near > far || far < 0) return null;
  }
  return near >= 0 ? near : 0;    // 0 = the ray starts inside the box
}
