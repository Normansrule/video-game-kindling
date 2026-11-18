// engine/3d/mesh.js
// WHAT: Upload a shape's corner data (positions, normals, texture coordinates and
//       triangle indices) to the graphics card once, then draw it with one call.
// WHY:  Sending data to the GPU is slow; drawing data already there is fast.
//       A VAO (Vertex Array Object) remembers the whole layout, so drawing is just
//       "bind this, draw N corners".
// DOC:  docs/modules/3d.md
//
// data = {
//   positions: [x, y, z,  x, y, z, ...]   3 numbers per corner ("vertex")
//   normals:   [x, y, z, ...]             which way each corner faces (for lighting)
//   uvs:       [u, v, ...]                where on the texture each corner sits (0..1)
//   indices:   [0, 1, 2,  2, 3, 0, ...]   3 corner numbers per triangle
// }

import { ATTRIBUTE } from "./shader.js";

export function createMesh(gl, data) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  function addAttribute(location, values, size) {
    if (!values || values.length === 0) return;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(values), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    // size numbers per vertex, floats, not normalized, tightly packed.
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
  }

  addAttribute(ATTRIBUTE.position, data.positions, 3);
  addAttribute(ATTRIBUTE.normal, data.normals, 3);
  addAttribute(ATTRIBUTE.uv, data.uvs, 2);

  let count = data.positions.length / 3;
  const indexed = Boolean(data.indices && data.indices.length);
  if (indexed) {
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    // 32-bit indices so big models (more than 65,535 corners) work too.
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(data.indices), gl.STATIC_DRAW);
    count = data.indices.length;
  }
  gl.bindVertexArray(null);

  function draw(mode = gl.TRIANGLES) {
    gl.bindVertexArray(vao);
    if (indexed) gl.drawElements(mode, count, gl.UNSIGNED_INT, 0);
    else gl.drawArrays(mode, 0, count);
    gl.bindVertexArray(null);
  }

  return { vao, count, indexed, draw };
}
