// engine/math/quat.js
// WHAT: Quaternions { x, y, z, w }: a safe way to store and blend 3D rotations.
// WHY:  Stacking three angles (yaw, pitch, roll) can "gimbal lock" and blends badly.
//       A quaternion is four numbers that rotate cleanly and slerp smoothly.
//       You rarely need the math inside: make one, multiply, turn into a matrix.
// DOC:  docs/modules/math.md   VIZ: viz/09-transforms/

export function identity() {
  return { x: 0, y: 0, z: 0, w: 1 };
}

// Rotation of `radians` around `axis` (axis should have length 1).
export function fromAxisAngle(axis, radians) {
  const half = radians / 2;
  const sine = Math.sin(half);
  return { x: axis.x * sine, y: axis.y * sine, z: axis.z * sine, w: Math.cos(half) };
}

// From yaw (around y), pitch (around x) and roll (around z), applied yaw, then pitch, then roll.
export function fromEuler(pitch, yaw, roll) {
  const yawQ = fromAxisAngle({ x: 0, y: 1, z: 0 }, yaw);
  const pitchQ = fromAxisAngle({ x: 1, y: 0, z: 0 }, pitch);
  const rollQ = fromAxisAngle({ x: 0, y: 0, z: 1 }, roll);
  return multiply(multiply(yawQ, pitchQ), rollQ);
}

// a * b: rotate by b first, then by a.
export function multiply(a, b) {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

export function length(q) {
  return Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
}

// Rounding errors slowly stretch quaternions; normalize after many multiplies.
export function normalize(q) {
  const size = length(q);
  if (size === 0) return identity();
  return { x: q.x / size, y: q.y / size, z: q.z / size, w: q.w / size };
}

// The opposite rotation (for unit quaternions).
export function conjugate(q) {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}

// Rotate a vector { x, y, z } by the quaternion.
export function rotateVector(q, vector) {
  const asQuat = { x: vector.x, y: vector.y, z: vector.z, w: 0 };
  const result = multiply(multiply(q, asQuat), conjugate(q));
  return { x: result.x, y: result.y, z: result.z };
}

// Spherical linear interpolation: the smooth, constant-speed blend from a to b.
export function slerp(a, b, t) {
  let cosine = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  let end = b;
  // Go the short way around the sphere.
  if (cosine < 0) {
    cosine = -cosine;
    end = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
  }
  // Very close together: a straight blend is accurate and avoids dividing by ~0.
  if (cosine > 0.9995) {
    return normalize({
      x: a.x + (end.x - a.x) * t,
      y: a.y + (end.y - a.y) * t,
      z: a.z + (end.z - a.z) * t,
      w: a.w + (end.w - a.w) * t,
    });
  }
  const angle = Math.acos(cosine);
  const sine = Math.sin(angle);
  const weightA = Math.sin((1 - t) * angle) / sine;
  const weightB = Math.sin(t * angle) / sine;
  return {
    x: a.x * weightA + end.x * weightB,
    y: a.y * weightA + end.y * weightB,
    z: a.z * weightA + end.z * weightB,
    w: a.w * weightA + end.w * weightB,
  };
}
