// engine/2d/sat.js
// WHAT: Collision for rotated boxes and any convex polygon, using SAT
//       (the Separating Axis Theorem).
// WHY:  AABBs can't rotate. SAT handles spinning asteroids, tilted platforms and
//       triangles. The idea: if you can find ONE direction where the shadows
//       ("projections") of the two shapes don't overlap, they don't touch.
//       For polygons you only need to try the directions at right angles to each edge.
// DOC:  docs/modules/collision.md   VIZ: viz/05-sat/
// LIMIT: shapes must be convex (no dents). Split a dented shape into convex parts.

// Make a polygon from points around its own center (0, 0), placed at x, y with a rotation.
export function createPolygon(localPoints, x = 0, y = 0, rotation = 0) {
  return { localPoints, x, y, rotation };
}

// A box as a polygon (so it can rotate).
export function createBoxPolygon(width, height, x = 0, y = 0, rotation = 0) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  return createPolygon([
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ], x, y, rotation);
}

// The corners in world space: rotate each local point, then move it.
export function worldPoints(polygon) {
  const cosine = Math.cos(polygon.rotation);
  const sine = Math.sin(polygon.rotation);
  const result = [];
  for (const point of polygon.localPoints) {
    result.push({
      x: polygon.x + point.x * cosine - point.y * sine,
      y: polygon.y + point.x * sine + point.y * cosine,
    });
  }
  return result;
}

// One axis per edge: the edge direction turned 90 degrees, length 1.
export function edgeNormals(points) {
  const normals = [];
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const edgeX = next.x - current.x;
    const edgeY = next.y - current.y;
    const size = Math.hypot(edgeX, edgeY) || 1;
    normals.push({ x: -edgeY / size, y: edgeX / size });
  }
  return normals;
}

// The "shadow" of the points on an axis: the smallest and largest dot product.
export function project(points, axis) {
  let min = Infinity;
  let max = -Infinity;
  for (const point of points) {
    const value = point.x * axis.x + point.y * axis.y;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

function centerOf(points) {
  let x = 0;
  let y = 0;
  for (const point of points) {
    x = x + point.x;
    y = y + point.y;
  }
  return { x: x / points.length, y: y / points.length };
}

// Test two polygons. Returns null if apart, or
// { depth, normal: { x, y } } = push polygon A by normal * depth to separate.
export function polygonsCollide(polygonA, polygonB) {
  const pointsA = worldPoints(polygonA);
  const pointsB = worldPoints(polygonB);
  return pointSetsCollide(pointsA, pointsB, edgeNormals(pointsA).concat(edgeNormals(pointsB)));
}

// Polygon vs circle { x, y, radius }. Extra axis: from the circle to the nearest corner.
export function polygonCircleCollide(polygon, circle) {
  const points = worldPoints(polygon);
  let nearest = points[0];
  let nearestDistance = Infinity;
  for (const point of points) {
    const distance = Math.hypot(point.x - circle.x, point.y - circle.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = point;
    }
  }
  const axes = edgeNormals(points);
  const toCorner = { x: nearest.x - circle.x, y: nearest.y - circle.y };
  const size = Math.hypot(toCorner.x, toCorner.y) || 1;
  axes.push({ x: toCorner.x / size, y: toCorner.y / size });

  let best = null;
  for (const axis of axes) {
    const shadowA = project(points, axis);
    const center = circle.x * axis.x + circle.y * axis.y;
    const shadowB = { min: center - circle.radius, max: center + circle.radius };
    const result = compareShadows(shadowA, shadowB, axis, best);
    if (result === null) return null;
    best = result;
  }
  return pointAway(best, centerOf(points), circle);
}

function pointSetsCollide(pointsA, pointsB, axes) {
  let best = null;
  for (const axis of axes) {
    const result = compareShadows(project(pointsA, axis), project(pointsB, axis), axis, best);
    if (result === null) return null;   // found a gap: separated
    best = result;
  }
  return pointAway(best, centerOf(pointsA), centerOf(pointsB));
}

// Overlap of two shadows on one axis. Keeps the axis with the smallest overlap.
function compareShadows(shadowA, shadowB, axis, best) {
  const overlap = Math.min(shadowA.max, shadowB.max) - Math.max(shadowA.min, shadowB.min);
  if (overlap <= 0) return null;
  if (best === null || overlap < best.depth) return { depth: overlap, normal: axis };
  return best;
}

// Make sure the normal points from B toward A, so "push A along normal" separates them.
function pointAway(result, centerA, centerB) {
  const towardA = { x: centerA.x - centerB.x, y: centerA.y - centerB.y };
  if (towardA.x * result.normal.x + towardA.y * result.normal.y < 0) {
    return { depth: result.depth, normal: { x: -result.normal.x, y: -result.normal.y } };
  }
  return result;
}
