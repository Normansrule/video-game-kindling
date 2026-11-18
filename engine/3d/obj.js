// engine/3d/obj.js
// WHAT: Read a Wavefront .obj file (a plain-text 3D model format) into mesh data.
// WHY:  Blender, MagicaVoxel and most free model packs (Kenney, Quaternius) export .obj.
//       It's text, so you can open it and read it:
//         v  1.0 2.0 3.0      a position
//         vt 0.5 0.5          a texture coordinate
//         vn 0.0 1.0 0.0      a normal
//         f  1/1/1 2/2/1 3/3/1   a face: position/uv/normal numbers, counted from 1
// DOC:  docs/modules/3d.md   FORMAT: https://en.wikipedia.org/wiki/Wavefront_.obj_file
// LIMIT: Ignores materials (.mtl), groups and smoothing. Faces with more than three
//        corners are split into triangles (a "fan"), which is right for convex faces.

export function parseOBJ(text) {
  const filePositions = [];
  const fileUvs = [];
  const fileNormals = [];
  const out = { positions: [], normals: [], uvs: [], indices: [] };
  const cornerIndexByKey = new Map();   // "p/t/n" -> output corner number (reuse identical corners)
  let missingNormals = false;

  function addCorner(token) {
    if (cornerIndexByKey.has(token)) return cornerIndexByKey.get(token);
    const [p, t, n] = token.split("/");
    // .obj counts from 1; negative numbers count back from the end of the list.
    const pick = (list, value) => {
      const number = parseInt(value, 10);
      return list[number < 0 ? list.length + number : number - 1];
    };
    const position = pick(filePositions, p);
    out.positions.push(position[0], position[1], position[2]);
    if (t) {
      const uv = pick(fileUvs, t);
      out.uvs.push(uv[0], uv[1]);
    } else {
      out.uvs.push(0, 0);
    }
    if (n) {
      const normal = pick(fileNormals, n);
      out.normals.push(normal[0], normal[1], normal[2]);
    } else {
      out.normals.push(0, 0, 0);
      missingNormals = true;
    }
    const index = out.positions.length / 3 - 1;
    cornerIndexByKey.set(token, index);
    return index;
  }

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const parts = line.split(/\s+/);
    const keyword = parts[0];
    const numbers = parts.slice(1).map(Number);
    if (keyword === "v") filePositions.push(numbers);
    else if (keyword === "vt") fileUvs.push(numbers);
    else if (keyword === "vn") fileNormals.push(numbers);
    else if (keyword === "f") {
      const corners = parts.slice(1).map(addCorner);
      for (let i = 1; i < corners.length - 1; i++) {
        out.indices.push(corners[0], corners[i], corners[i + 1]);
      }
    }
  }

  if (missingNormals) computeNormals(out);
  return out;
}

// Give each corner the average normal of the triangles that use it.
export function computeNormals(data) {
  const normals = new Array(data.positions.length).fill(0);
  const p = data.positions;
  for (let i = 0; i < data.indices.length; i += 3) {
    const a = data.indices[i] * 3;
    const b = data.indices[i + 1] * 3;
    const c = data.indices[i + 2] * 3;
    // Two edges of the triangle; their cross product points out of the face.
    const edge1 = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
    const edge2 = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
    const face = [
      edge1[1] * edge2[2] - edge1[2] * edge2[1],
      edge1[2] * edge2[0] - edge1[0] * edge2[2],
      edge1[0] * edge2[1] - edge1[1] * edge2[0],
    ];
    for (const corner of [a, b, c]) {
      normals[corner] += face[0];
      normals[corner + 1] += face[1];
      normals[corner + 2] += face[2];
    }
  }
  for (let i = 0; i < normals.length; i += 3) {
    const size = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
    normals[i] /= size;
    normals[i + 1] /= size;
    normals[i + 2] /= size;
  }
  data.normals = normals;
  return data;
}
