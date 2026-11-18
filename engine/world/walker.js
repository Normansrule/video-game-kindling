// engine/world/walker.js
// WHAT: Moves a character through a block world: gravity, jumping, sliding along
//       walls, and stepping up one-block ledges automatically. Works the same in
//       every view (2D map, isometric, raycaster, 3D).
// WHY:  The player is a small upright box (the "collider"). Each step we move it
//       one axis at a time and, if it would end up inside a solid block, push it
//       back out. Moving axis by axis is what lets you slide along a wall instead
//       of sticking to it (same idea as 2d/physics.js, one dimension up).
// DOC:  docs/modules/world.md (section "Walking around")
//
// Usage:
//   const walker = createWalker({ x: 10, y: 20, z: 10 });
//   // each fixed step:
//   walker.wishX = input right - left; walker.wishZ = back - forward (world directions)
//   updateWalker(world, walker, dt);

import { isSolid } from "./blocks.js";

export function createWalker(start = {}) {
  return {
    x: start.x ?? 0,
    y: start.y ?? 0,
    z: start.z ?? 0,
    yaw: start.yaw ?? 0,
    velocityY: 0,
    radius: 0.3,          // half the width of the collider
    height: 1.7,          // in blocks
    speed: 4.5,           // blocks per second
    jumpSpeed: 7.5,
    gravity: 22,
    onGround: false,
    wishX: 0,             // where the player WANTS to go this step (-1..1, world axes)
    wishZ: 0,
    wantsJump: false,
    autoStep: true,       // walk up one-block ledges without jumping
  };
}

// Does the walker's box, if it stood at (x, y, z), overlap any solid block?
export function collides(world, walker, x, y, z) {
  const minX = Math.floor(x - walker.radius);
  const maxX = Math.floor(x + walker.radius);
  const minY = Math.floor(y);
  const maxY = Math.floor(y + walker.height - 0.01);
  const minZ = Math.floor(z - walker.radius);
  const maxZ = Math.floor(z + walker.radius);
  for (let blockY = minY; blockY <= maxY; blockY++) {
    for (let blockZ = minZ; blockZ <= maxZ; blockZ++) {
      for (let blockX = minX; blockX <= maxX; blockX++) {
        if (isSolid(world.get(blockX, blockY, blockZ))) return true;
      }
    }
  }
  // Leaving the world sideways counts as hitting a wall.
  if (x - walker.radius < 0 || z - walker.radius < 0 || x + walker.radius > world.width || z + walker.radius > world.depth) return true;
  return false;
}

// Move along one horizontal axis. If blocked, try again one block higher (a step).
function moveHorizontal(world, walker, deltaX, deltaZ) {
  const targetX = walker.x + deltaX;
  const targetZ = walker.z + deltaZ;
  if (!collides(world, walker, targetX, walker.y, targetZ)) {
    walker.x = targetX;
    walker.z = targetZ;
    return true;
  }
  if (walker.autoStep && walker.onGround && !collides(world, walker, targetX, walker.y + 1.01, targetZ)) {
    walker.x = targetX;
    walker.z = targetZ;
    walker.y = Math.floor(walker.y) + 1;
    return true;
  }
  return false;
}

export function updateWalker(world, walker, stepSeconds) {
  // Normalize diagonal input so moving diagonally isn't 41% faster.
  let wishX = walker.wishX;
  let wishZ = walker.wishZ;
  const wishLength = Math.hypot(wishX, wishZ);
  if (wishLength > 1) { wishX /= wishLength; wishZ /= wishLength; }
  moveHorizontal(world, walker, wishX * walker.speed * stepSeconds, 0);
  moveHorizontal(world, walker, 0, wishZ * walker.speed * stepSeconds);

  if (walker.wantsJump && walker.onGround) walker.velocityY = walker.jumpSpeed;
  walker.velocityY -= walker.gravity * stepSeconds;
  const targetY = walker.y + walker.velocityY * stepSeconds;
  if (collides(world, walker, walker.x, targetY, walker.z)) {
    // Landed (moving down) or bumped your head (moving up): snap to the block edge.
    if (walker.velocityY < 0) {
      walker.y = Math.floor(targetY) + 1;
      walker.onGround = true;
    }
    walker.velocityY = 0;
  } else {
    walker.y = targetY;
    walker.onGround = false;
  }
  // Fell out of the world: put the walker back on top of its column.
  if (walker.y < -10) {
    walker.y = world.groundHeight(walker.x, walker.z) + 0.01;
    walker.velocityY = 0;
  }
}

// Turn "forward / right" input into world directions using the walker's yaw.
// yaw 0 faces north (-z). Used by first-person and raycaster controls.
export function wishFromYaw(walker, forward, right) {
  const sin = Math.sin(walker.yaw);
  const cos = Math.cos(walker.yaw);
  walker.wishX = -sin * forward + cos * right;
  walker.wishZ = -cos * forward - sin * right;
}

