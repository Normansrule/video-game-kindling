// engine/3d/primitives.js
// WHAT: Ready-made shapes as plain data: box/cube, plane (floor) and sphere.
//       Pass the result to createMesh(gl, data) to draw it.
// WHY:  Most jam 3D games are boxes, floors and balls. Building them by hand also
//       shows exactly what a mesh is: corners, normals, texture coordinates, triangles.
// DOC:  docs/modules/3d.md
// RULE: Triangles list their corners counter-clockwise when seen from OUTSIDE,
//       so back-face culling hides the inside (tests/checks/3d.checks.js checks this).

// A box centered on (0, 0, 0). Each face has its own 4 corners so it can have
// its own flat normal and a full 0..1 texture.
export function box(width = 1, height = 1, depth = 1) {
  const half = { x: width / 2, y: height / 2, z: depth / 2 };
  // For each face: its normal n, and two directions u (texture right) and v (texture up),
  // chosen so that u x v = n. That makes the corner order counter-clockwise from outside.
  const faces = [
    { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
    { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
  ];
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const halves = [half.x, half.y, half.z];
  // How far to go along a direction: the half size on whichever axis it points along.
  function reach(direction) {
    return Math.abs(direction[0]) * halves[0] + Math.abs(direction[1]) * halves[1] + Math.abs(direction[2]) * halves[2];
  }
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];   // (u, v) signs, counter-clockwise
  for (const face of faces) {
    const start = positions.length / 3;
    const normalReach = reach(face.n);
    const uReach = reach(face.u);
    const vReach = reach(face.v);
    for (const [uSign, vSign] of corners) {
      for (let axis = 0; axis < 3; axis++) {
        positions.push(face.n[axis] * normalReach + face.u[axis] * uReach * uSign + face.v[axis] * vReach * vSign);
      }
      normals.push(face.n[0], face.n[1], face.n[2]);
      uvs.push((uSign + 1) / 2, (vSign + 1) / 2);
    }
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  return { positions, normals, uvs, indices };
}

export function cube(size = 1) {
  return box(size, size, size);
}

// A flat floor on the XZ plane, facing up (+y), centered on (0, 0, 0).
// subdivisions splits it into a grid; uvRepeat tiles a texture that many times.
export function plane(width = 10, depth = 10, subdivisions = 1, uvRepeat = 1) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let row = 0; row <= subdivisions; row++) {
    for (let column = 0; column <= subdivisions; column++) {
      const u = column / subdivisions;
      const v = row / subdivisions;
      // Rows go away from the viewer (toward -z) so triangles wind counter-clockwise from above.
      positions.push(-width / 2 + u * width, 0, depth / 2 - v * depth);
      normals.push(0, 1, 0);
      uvs.push(u * uvRepeat, v * uvRepeat);
    }
  }
  const perRow = subdivisions + 1;
  for (let row = 0; row < subdivisions; row++) {
    for (let column = 0; column < subdivisions; column++) {
      const a = row * perRow + column;
      const b = a + 1;
      const c = a + perRow + 1;
      const d = a + perRow;
      indices.push(a, b, c, a, c, d);
    }
  }
  return { positions, normals, uvs, indices };
}

// A "UV sphere": rings from top to bottom, segments around, like a globe's grid.
export function sphere(radius = 0.5, segments = 24, rings = 16) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let ring = 0; ring <= rings; ring++) {
    const polar = (ring / rings) * Math.PI;              // 0 at the top, PI at the bottom
    for (let segment = 0; segment <= segments; segment++) {
      const around = (segment / segments) * Math.PI * 2;
      const x = Math.sin(polar) * Math.cos(around);
      const y = Math.cos(polar);
      const z = -Math.sin(polar) * Math.sin(around);
      positions.push(x * radius, y * radius, z * radius);
      normals.push(x, y, z);                             // on a sphere, normal = direction from center
      uvs.push(segment / segments, 1 - ring / rings);
    }
  }
  const perRing = segments + 1;
  for (let ring = 0; ring < rings; ring++) {
    for (let segment = 0; segment < segments; segment++) {
      const a = ring * perRing + segment;
      const b = a + perRing;
      // Skip the squashed triangles at the poles.
      if (ring !== 0) indices.push(a, b, a + 1);
      if (ring !== rings - 1) indices.push(a + 1, b, b + 1);
    }
  }
  return { positions, normals, uvs, indices };
}
