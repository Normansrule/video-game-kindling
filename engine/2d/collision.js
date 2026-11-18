// engine/2d/collision.js
// WHAT: "Are these two shapes touching?" and "how far do I push them apart?"
//       for points, AABBs (Axis-Aligned Bounding Boxes) and circles.
// WHY:  Almost every 2D game is boxes and circles. These tests are a few lines each,
//       fast, and easy to see in your head. Rotated shapes need SAT (see sat.js).
// DOC:  docs/modules/collision.md   VIZ: viz/04-collision/
//
// Shapes are plain objects:
//   rectangle (AABB): { x, y, width, height }   x, y = top-left corner
//   circle:           { x, y, radius }          x, y = center

export function pointInRect(point, rect) {
  return point.x >= rect.x && point.x < rect.x + rect.width &&
         point.y >= rect.y && point.y < rect.y + rect.height;
}

export function pointInCircle(point, circle) {
  const dx = point.x - circle.x;
  const dy = point.y - circle.y;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

// Two boxes overlap unless one is completely left, right, above or below the other.
export function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

// Compare squared distances so we never need a square root.
export function circlesOverlap(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const radii = a.radius + b.radius;
  return dx * dx + dy * dy < radii * radii;
}

// The point inside a rectangle closest to (x, y). Key idea for circle vs box.
export function closestPointInRect(x, y, rect) {
  return {
    x: Math.max(rect.x, Math.min(x, rect.x + rect.width)),
    y: Math.max(rect.y, Math.min(y, rect.y + rect.height)),
  };
}

export function circleRectOverlap(circle, rect) {
  const closest = closestPointInRect(circle.x, circle.y, rect);
  return pointInCircle(closest, circle);
}

// --- Resolution: how to push shape A out of shape B -------------------------
// Each returns null when not touching, or { x, y } = the smallest push for A
// (the "minimum translation vector"). Add it to A's position to separate them.

export function rectPushOut(a, b) {
  if (!rectsOverlap(a, b)) return null;
  // How deep is the overlap on each side?
  const pushLeft = b.x - (a.x + a.width);    // negative: move A left
  const pushRight = b.x + b.width - a.x;     // positive: move A right
  const pushUp = b.y - (a.y + a.height);
  const pushDown = b.y + b.height - a.y;
  // Pick the smallest move on each axis, then the smaller of the two axes.
  const moveX = Math.abs(pushLeft) < pushRight ? pushLeft : pushRight;
  const moveY = Math.abs(pushUp) < pushDown ? pushUp : pushDown;
  if (Math.abs(moveX) < Math.abs(moveY)) return { x: moveX, y: 0 };
  return { x: 0, y: moveY };
}

export function circlePushOut(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const overlap = a.radius + b.radius - distance;
  if (overlap <= 0) return null;
  // Exactly on top of each other: pick a direction instead of dividing by zero.
  if (distance === 0) return { x: overlap, y: 0 };
  return { x: (dx / distance) * overlap, y: (dy / distance) * overlap };
}

export function circleRectPushOut(circle, rect) {
  const closest = closestPointInRect(circle.x, circle.y, rect);
  const dx = circle.x - closest.x;
  const dy = circle.y - closest.y;
  const distanceSquared = dx * dx + dy * dy;
  if (distanceSquared >= circle.radius * circle.radius) return null;

  if (distanceSquared > 0) {
    // Center outside the box: push straight away from the closest point.
    const distance = Math.sqrt(distanceSquared);
    const overlap = circle.radius - distance;
    return { x: (dx / distance) * overlap, y: (dy / distance) * overlap };
  }
  // Center inside the box: push out through the nearest side.
  const asBox = { x: circle.x - circle.radius, y: circle.y - circle.radius, width: circle.radius * 2, height: circle.radius * 2 };
  return rectPushOut(asBox, rect);
}

// --- Rays --------------------------------------------------------------------
// Where does a ray from `origin` in `direction` first hit the rectangle?
// Returns the distance along the ray (in units of `direction` length), or null.
// Uses the "slab" method: the ray is inside the box where it is inside both
// the x-slab and the y-slab at the same time.
export function rayRect(origin, direction, rect) {
  let nearest = -Infinity;
  let farthest = Infinity;
  const axes = [
    ["x", "width"],
    ["y", "height"],
  ];
  for (const [axis, size] of axes) {
    if (direction[axis] === 0) {
      if (origin[axis] < rect[axis] || origin[axis] > rect[axis] + rect[size]) return null;
      continue;
    }
    let enter = (rect[axis] - origin[axis]) / direction[axis];
    let exit = (rect[axis] + rect[size] - origin[axis]) / direction[axis];
    if (enter > exit) {
      const swap = enter;
      enter = exit;
      exit = swap;
    }
    nearest = Math.max(nearest, enter);
    farthest = Math.min(farthest, exit);
  }
  if (nearest > farthest || farthest < 0) return null;
  return nearest >= 0 ? nearest : 0;
}

// Center of a rectangle, handy for aiming and distances.
export function rectCenter(rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}
