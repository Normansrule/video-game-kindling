// engine/2d/physics.js
// WHAT: Simple "arcade" physics: bodies with velocity and gravity that slide along
//       walls and floors, plus bouncing balls.
// WHY:  Platformers and top-down games don't need a real physics engine. They need
//       "move, and stop at walls". Moving one axis at a time (x, then y) makes
//       that easy and stops you from sticking to corners.
// DOC:  docs/modules/physics.md   VIZ: viz/06-physics/
//
// Units: pixels, seconds. velocity in pixels/second, gravity in pixels/second².

export function createBody(options = {}) {
  return {
    x: options.x || 0,
    y: options.y || 0,
    width: options.width || 16,
    height: options.height || 16,
    velocityX: options.velocityX || 0,
    velocityY: options.velocityY || 0,
    gravity: options.gravity || 0,          // e.g. 900 for a platformer
    maxFallSpeed: options.maxFallSpeed || 600,
    bounce: options.bounce || 0,            // 0 = stop at walls, 1 = perfect bounce
    onGround: false,
    touching: { left: false, right: false, top: false, bottom: false },
  };
}

// A world made of solid rectangles. Anything with solidsNear(rect) works as a world,
// including a tilemap (see tilemap.js).
// Give a rectangle oneWay: true for a platform you can jump up through.
export function createSolids(rects) {
  return {
    rects,
    solidsNear(area) {
      const result = [];
      for (const solid of rects) {
        if (solid.x < area.x + area.width && solid.x + solid.width > area.x &&
            solid.y < area.y + area.height && solid.y + solid.height > area.y) {
          result.push(solid);
        }
      }
      return result;
    },
  };
}

// Move a body by its velocity for one step and stop it at solids.
// Sets body.onGround and body.touching. Returns true if it hit anything.
export function moveAndCollide(body, stepSeconds, world) {
  // Gravity changes velocity; velocity changes position ("semi-implicit Euler").
  body.velocityY = Math.min(body.velocityY + body.gravity * stepSeconds, body.maxFallSpeed);
  body.touching.left = body.touching.right = body.touching.top = body.touching.bottom = false;

  const previousBottom = body.y + body.height;
  moveAxis(body, "x", body.velocityX * stepSeconds, world, previousBottom);
  moveAxis(body, "y", body.velocityY * stepSeconds, world, previousBottom);

  body.onGround = body.touching.bottom;
  const touching = body.touching;
  return touching.left || touching.right || touching.top || touching.bottom;
}

function moveAxis(body, axis, distance, world, previousBottom) {
  if (distance === 0) return;
  body[axis] = body[axis] + distance;
  const solids = world ? world.solidsNear(body) : [];

  for (const solid of solids) {
    // One-way platforms only stop you when you fall onto them from above.
    if (solid.oneWay && (axis === "x" || distance < 0 || previousBottom > solid.y + 0.01)) continue;

    if (axis === "x") {
      if (distance > 0) {
        body.x = solid.x - body.width;          // hit a wall on the right
        body.touching.right = true;
      } else {
        body.x = solid.x + solid.width;         // hit a wall on the left
        body.touching.left = true;
      }
      body.velocityX = -body.velocityX * body.bounce;
    } else {
      if (distance > 0) {
        body.y = solid.y - body.height;         // landed on the floor
        body.touching.bottom = true;
      } else {
        body.y = solid.y + solid.height;        // bumped a ceiling
        body.touching.top = true;
      }
      body.velocityY = -body.velocityY * body.bounce;
    }
  }
}

// Keep a body inside a rectangle (like the screen), bouncing if body.bounce > 0.
// Returns which edges it hit: { left, right, top, bottom }.
export function keepInside(body, bounds) {
  const hit = { left: false, right: false, top: false, bottom: false };
  if (body.x < bounds.x) {
    body.x = bounds.x;
    body.velocityX = Math.abs(body.velocityX) * body.bounce;
    hit.left = true;
  }
  if (body.x + body.width > bounds.x + bounds.width) {
    body.x = bounds.x + bounds.width - body.width;
    body.velocityX = -Math.abs(body.velocityX) * body.bounce;
    hit.right = true;
  }
  if (body.y < bounds.y) {
    body.y = bounds.y;
    body.velocityY = Math.abs(body.velocityY) * body.bounce;
    hit.top = true;
  }
  if (body.y + body.height > bounds.y + bounds.height) {
    body.y = bounds.y + bounds.height - body.height;
    body.velocityY = -Math.abs(body.velocityY) * body.bounce;
    hit.bottom = true;
  }
  return hit;
}

// Two moving circles { x, y, radius, velocityX, velocityY, mass } bounce off each other.
// restitution: 1 = perfectly bouncy, 0 = they stick together. Returns true on contact.
export function bounceCircles(a, b, restitution = 1) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy);
  const overlap = a.radius + b.radius - distance;
  if (overlap <= 0 || distance === 0) return false;

  const normalX = dx / distance;
  const normalY = dy / distance;
  const massA = a.mass || 1;
  const massB = b.mass || 1;

  // 1. Separate them, heavier circles move less.
  const total = massA + massB;
  a.x -= normalX * overlap * (massB / total);
  a.y -= normalY * overlap * (massB / total);
  b.x += normalX * overlap * (massA / total);
  b.y += normalY * overlap * (massA / total);

  // 2. How fast are they closing along the line between them?
  const closingSpeed = (b.velocityX - a.velocityX) * normalX + (b.velocityY - a.velocityY) * normalY;
  if (closingSpeed > 0) return true;   // already moving apart

  // 3. Push velocities apart along that line (an "impulse").
  const impulse = (-(1 + restitution) * closingSpeed) / (1 / massA + 1 / massB);
  a.velocityX -= (impulse / massA) * normalX;
  a.velocityY -= (impulse / massA) * normalY;
  b.velocityX += (impulse / massB) * normalX;
  b.velocityY += (impulse / massB) * normalY;
  return true;
}
