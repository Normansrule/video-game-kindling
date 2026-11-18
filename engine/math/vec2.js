// engine/math/vec2.js
// WHAT: 2D vectors as plain objects { x, y } plus functions that work on them.
// WHY:  Positions, velocities, directions and sizes in 2D are all vectors.
//       Every function returns a NEW vector and never changes its inputs, so
//       you can't accidentally move the player by computing a distance.
// DOC:  docs/modules/math.md   VIZ: viz/04-collision/

export function create(x = 0, y = 0) {
  return { x: x, y: y };
}

export function clone(vector) {
  return { x: vector.x, y: vector.y };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(vector, amount) {
  return { x: vector.x * amount, y: vector.y * amount };
}

// Dot product: how much two vectors point the same way.
// Positive = same direction, 0 = at right angles, negative = opposite.
export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

// 2D cross product gives a single number: positive if b is counter-clockwise from a.
export function cross(a, b) {
  return a.x * b.y - a.y * b.x;
}

export function lengthSquared(vector) {
  return vector.x * vector.x + vector.y * vector.y;
}

export function length(vector) {
  return Math.sqrt(lengthSquared(vector));
}

export function distance(a, b) {
  return length(subtract(a, b));
}

// Same direction, length 1. A zero vector stays zero instead of becoming NaN.
export function normalize(vector) {
  const size = length(vector);
  if (size === 0) return { x: 0, y: 0 };
  return { x: vector.x / size, y: vector.y / size };
}

// Rotate counter-clockwise (in math coordinates) by an angle in radians.
// On a canvas, where y points down, this looks clockwise.
export function rotate(vector, radians) {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine,
  };
}

// A vector at right angles to the input (rotated +90 degrees).
export function perpendicular(vector) {
  return { x: -vector.y, y: vector.x };
}

export function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

// A unit vector pointing at the given angle (radians, 0 = right).
export function fromAngle(radians, size = 1) {
  return { x: Math.cos(radians) * size, y: Math.sin(radians) * size };
}

// The angle of a vector in radians, from -PI to PI.
export function angle(vector) {
  return Math.atan2(vector.y, vector.x);
}

// Shorten the vector if it is longer than maxLength (useful for top speeds).
export function limit(vector, maxLength) {
  const size = length(vector);
  if (size <= maxLength || size === 0) return clone(vector);
  return scale(vector, maxLength / size);
}

export function equals(a, b, tolerance = 1e-6) {
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}
