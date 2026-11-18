// engine/math/mat4.js
// WHAT: 4x4 matrices for 3D: move, rotate, scale, cameras and projection.
// WHY:  WebGL multiplies every vertex by matrices to place it in the world and
//       then on screen. One 4x4 matrix can hold move + rotate + scale at once.
// DOC:  docs/modules/math.md   VIZ: viz/09-transforms/
//
// LAYOUT: a Float32Array of 16 numbers in COLUMN-MAJOR order (what WebGL expects).
//   index = column * 4 + row
//   [ m0 m4 m8  m12 ]     m12, m13, m14 hold the translation (x, y, z).
//   [ m1 m5 m9  m13 ]
//   [ m2 m6 m10 m14 ]
//   [ m3 m7 m11 m15 ]
// Every function returns a NEW matrix and leaves its inputs alone.

export function identity() {
  const out = new Float32Array(16);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

export function clone(matrix) {
  return new Float32Array(matrix);
}

// a * b: apply b first, then a. (Read right to left.)
export function multiply(a, b) {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum = sum + a[k * 4 + row] * b[column * 4 + k];
      }
      out[column * 4 + row] = sum;
    }
  }
  return out;
}

export function translation(x, y, z) {
  const out = identity();
  out[12] = x;
  out[13] = y;
  out[14] = z;
  return out;
}

export function scaling(x, y, z) {
  const out = identity();
  out[0] = x;
  out[5] = y;
  out[10] = z;
  return out;
}

export function rotationX(radians) {
  const out = identity();
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  out[5] = cosine;
  out[6] = sine;
  out[9] = -sine;
  out[10] = cosine;
  return out;
}

export function rotationY(radians) {
  const out = identity();
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  out[0] = cosine;
  out[2] = -sine;
  out[8] = sine;
  out[10] = cosine;
  return out;
}

export function rotationZ(radians) {
  const out = identity();
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  out[0] = cosine;
  out[1] = sine;
  out[4] = -sine;
  out[5] = cosine;
  return out;
}

// Handy chain helpers: translate(m, v) = m * translation(v), and so on.
export function translate(matrix, vector) {
  return multiply(matrix, translation(vector.x, vector.y, vector.z));
}
export function rotateX(matrix, radians) {
  return multiply(matrix, rotationX(radians));
}
export function rotateY(matrix, radians) {
  return multiply(matrix, rotationY(radians));
}
export function rotateZ(matrix, radians) {
  return multiply(matrix, rotationZ(radians));
}
export function scale(matrix, vector) {
  return multiply(matrix, scaling(vector.x, vector.y, vector.z));
}

// Perspective projection: things further away look smaller.
// fieldOfViewY in radians, aspect = width / height, near and far > 0.
export function perspective(fieldOfViewY, aspect, near, far) {
  const out = new Float32Array(16);
  const focal = 1 / Math.tan(fieldOfViewY / 2);
  out[0] = focal / aspect;
  out[5] = focal;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

// Orthographic projection: no perspective, parallel lines stay parallel.
export function orthographic(left, right, bottom, top, near, far) {
  const out = identity();
  out[0] = 2 / (right - left);
  out[5] = 2 / (top - bottom);
  out[10] = -2 / (far - near);
  out[12] = -(right + left) / (right - left);
  out[13] = -(top + bottom) / (top - bottom);
  out[14] = -(far + near) / (far - near);
  return out;
}

// A view matrix for a camera at eye, looking at target. up is usually { x: 0, y: 1, z: 0 }.
export function lookAt(eye, target, up) {
  // forward points from the target back to the eye (the camera looks down -z).
  let forwardX = eye.x - target.x;
  let forwardY = eye.y - target.y;
  let forwardZ = eye.z - target.z;
  let size = Math.hypot(forwardX, forwardY, forwardZ) || 1;
  forwardX /= size; forwardY /= size; forwardZ /= size;

  // right = up x forward
  let rightX = up.y * forwardZ - up.z * forwardY;
  let rightY = up.z * forwardX - up.x * forwardZ;
  let rightZ = up.x * forwardY - up.y * forwardX;
  size = Math.hypot(rightX, rightY, rightZ) || 1;
  rightX /= size; rightY /= size; rightZ /= size;

  // trueUp = forward x right
  const upX = forwardY * rightZ - forwardZ * rightY;
  const upY = forwardZ * rightX - forwardX * rightZ;
  const upZ = forwardX * rightY - forwardY * rightX;

  const out = identity();
  out[0] = rightX; out[4] = rightY; out[8] = rightZ;
  out[1] = upX;    out[5] = upY;    out[9] = upZ;
  out[2] = forwardX; out[6] = forwardY; out[10] = forwardZ;
  out[12] = -(rightX * eye.x + rightY * eye.y + rightZ * eye.z);
  out[13] = -(upX * eye.x + upY * eye.y + upZ * eye.z);
  out[14] = -(forwardX * eye.x + forwardY * eye.y + forwardZ * eye.z);
  return out;
}

export function transpose(matrix) {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      out[row * 4 + column] = matrix[column * 4 + row];
    }
  }
  return out;
}

// Inverse by cofactors. Returns null if the matrix cannot be inverted.
export function invert(m) {
  const inv = new Float32Array(16);
  inv[0] = m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15] + m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10];
  inv[4] = -m[4]*m[10]*m[15] + m[4]*m[11]*m[14] + m[8]*m[6]*m[15] - m[8]*m[7]*m[14] - m[12]*m[6]*m[11] + m[12]*m[7]*m[10];
  inv[8] = m[4]*m[9]*m[15] - m[4]*m[11]*m[13] - m[8]*m[5]*m[15] + m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9];
  inv[12] = -m[4]*m[9]*m[14] + m[4]*m[10]*m[13] + m[8]*m[5]*m[14] - m[8]*m[6]*m[13] - m[12]*m[5]*m[10] + m[12]*m[6]*m[9];
  inv[1] = -m[1]*m[10]*m[15] + m[1]*m[11]*m[14] + m[9]*m[2]*m[15] - m[9]*m[3]*m[14] - m[13]*m[2]*m[11] + m[13]*m[3]*m[10];
  inv[5] = m[0]*m[10]*m[15] - m[0]*m[11]*m[14] - m[8]*m[2]*m[15] + m[8]*m[3]*m[14] + m[12]*m[2]*m[11] - m[12]*m[3]*m[10];
  inv[9] = -m[0]*m[9]*m[15] + m[0]*m[11]*m[13] + m[8]*m[1]*m[15] - m[8]*m[3]*m[13] - m[12]*m[1]*m[11] + m[12]*m[3]*m[9];
  inv[13] = m[0]*m[9]*m[14] - m[0]*m[10]*m[13] - m[8]*m[1]*m[14] + m[8]*m[2]*m[13] + m[12]*m[1]*m[10] - m[12]*m[2]*m[9];
  inv[2] = m[1]*m[6]*m[15] - m[1]*m[7]*m[14] - m[5]*m[2]*m[15] + m[5]*m[3]*m[14] + m[13]*m[2]*m[7] - m[13]*m[3]*m[6];
  inv[6] = -m[0]*m[6]*m[15] + m[0]*m[7]*m[14] + m[4]*m[2]*m[15] - m[4]*m[3]*m[14] - m[12]*m[2]*m[7] + m[12]*m[3]*m[6];
  inv[10] = m[0]*m[5]*m[15] - m[0]*m[7]*m[13] - m[4]*m[1]*m[15] + m[4]*m[3]*m[13] + m[12]*m[1]*m[7] - m[12]*m[3]*m[5];
  inv[14] = -m[0]*m[5]*m[14] + m[0]*m[6]*m[13] + m[4]*m[1]*m[14] - m[4]*m[2]*m[13] - m[12]*m[1]*m[6] + m[12]*m[2]*m[5];
  inv[3] = -m[1]*m[6]*m[11] + m[1]*m[7]*m[10] + m[5]*m[2]*m[11] - m[5]*m[3]*m[10] - m[9]*m[2]*m[7] + m[9]*m[3]*m[6];
  inv[7] = m[0]*m[6]*m[11] - m[0]*m[7]*m[10] - m[4]*m[2]*m[11] + m[4]*m[3]*m[10] + m[8]*m[2]*m[7] - m[8]*m[3]*m[6];
  inv[11] = -m[0]*m[5]*m[11] + m[0]*m[7]*m[9] + m[4]*m[1]*m[11] - m[4]*m[3]*m[9] - m[8]*m[1]*m[7] + m[8]*m[3]*m[5];
  inv[15] = m[0]*m[5]*m[10] - m[0]*m[6]*m[9] - m[4]*m[1]*m[10] + m[4]*m[2]*m[9] + m[8]*m[1]*m[6] - m[8]*m[2]*m[5];
  const determinant = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
  if (determinant === 0) return null;
  for (let i = 0; i < 16; i++) inv[i] = inv[i] / determinant;
  return inv;
}

// The matrix for transforming NORMALS: inverse-transpose of the model matrix.
// (Plain model matrices bend normals wrongly when an object is scaled unevenly.)
export function normalMatrix(model) {
  const inverse = invert(model);
  if (inverse === null) return identity();
  return transpose(inverse);
}

// Rotation matrix from a quaternion { x, y, z, w } (see quat.js).
export function fromQuat(q) {
  const out = identity();
  const xx = q.x * q.x, yy = q.y * q.y, zz = q.z * q.z;
  const xy = q.x * q.y, xz = q.x * q.z, yz = q.y * q.z;
  const wx = q.w * q.x, wy = q.w * q.y, wz = q.w * q.z;
  out[0] = 1 - 2 * (yy + zz); out[4] = 2 * (xy - wz);     out[8] = 2 * (xz + wy);
  out[1] = 2 * (xy + wz);     out[5] = 1 - 2 * (xx + zz); out[9] = 2 * (yz - wx);
  out[2] = 2 * (xz - wy);     out[6] = 2 * (yz + wx);     out[10] = 1 - 2 * (xx + yy);
  return out;
}

// Multiply a point { x, y, z } by the matrix (w = 1, includes translation).
export function transformPoint(matrix, point) {
  const x = point.x, y = point.y, z = point.z;
  const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15] || 1;
  return {
    x: (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w,
    y: (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w,
    z: (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / w,
  };
}
