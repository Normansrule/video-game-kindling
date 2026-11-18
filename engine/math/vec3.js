// engine/math/vec3.js
// WHAT: 3D vectors as plain objects { x, y, z } and functions on them.
// WHY:  3D positions, directions, normals and colors. Same rules as vec2:
//       every function returns a new vector and never changes its inputs.
// DOC:  docs/modules/math.md   VIZ: viz/09-transforms/

export function create(x = 0, y = 0, z = 0) {
  return { x: x, y: y, z: z };
}

export function clone(vector) {
  return { x: vector.x, y: vector.y, z: vector.z };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(vector, amount) {
  return { x: vector.x * amount, y: vector.y * amount, z: vector.z * amount };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

// Cross product: a vector at right angles to both a and b.
// Its length is the area of the parallelogram they make. Used for normals and cameras.
export function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function lengthSquared(vector) {
  return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
}

export function length(vector) {
  return Math.sqrt(lengthSquared(vector));
}

export function distance(a, b) {
  return length(subtract(a, b));
}

export function normalize(vector) {
  const size = length(vector);
  if (size === 0) return { x: 0, y: 0, z: 0 };
  return { x: vector.x / size, y: vector.y / size, z: vector.z / size };
}

export function lerp(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function negate(vector) {
  return { x: -vector.x, y: -vector.y, z: -vector.z };
}

// Turn { x, y, z } into [x, y, z] for WebGL uniforms.
export function toArray(vector) {
  return [vector.x, vector.y, vector.z];
}

export function equals(a, b, tolerance = 1e-6) {
  return (
    Math.abs(a.x - b.x) <= tolerance &&
    Math.abs(a.y - b.y) <= tolerance &&
    Math.abs(a.z - b.z) <= tolerance
  );
}
