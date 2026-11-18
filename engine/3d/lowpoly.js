// engine/3d/lowpoly.js
// WHAT: Build low-poly, vertex-colored 3D models from code: boxes, cones, cylinders
//       and lumpy rocks, combined into ready-made props (pine tree, round tree, rock,
//       coin, crystal) and a blocky character with separate limbs you can animate.
// WHY:  Flat-shaded low-poly shapes with a good palette look clean and intentional,
//       need no texture files, and stay tiny. Every model is plain mesh data, so
//       you can read exactly what a "model" is: a list of colored triangles.
// DOC:  docs/modules/3d-stylized.md (section "Low-poly models")
//
// Usage:
//   const builder = createModelBuilder();
//   builder.box(0, 0.5, 0, 1, 1, 1, [0.9, 0.4, 0.2]);
//   const mesh = createMesh(gl, builder.data());   // draw with worldRenderer.drawModel

import { createRandom } from "../math/random.js";

export function createModelBuilder() {
  const positions = [];
  const normals = [];
  const extras = [];   // r, g, b, glow for every corner

  // One flat triangle. Its normal comes from the cross product of two edges,
  // so every triangle is evenly lit: that is what gives the faceted low-poly look.
  function triangle(a, b, c, color, glow = 0) {
    const edge1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const edge2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let nx = edge1[1] * edge2[2] - edge1[2] * edge2[1];
    let ny = edge1[2] * edge2[0] - edge1[0] * edge2[2];
    let nz = edge1[0] * edge2[1] - edge1[1] * edge2[0];
    const size = Math.hypot(nx, ny, nz) || 1;
    nx /= size; ny /= size; nz /= size;
    for (const corner of [a, b, c]) {
      positions.push(corner[0], corner[1], corner[2]);
      normals.push(nx, ny, nz);
      extras.push(color[0], color[1], color[2], glow);
    }
  }

  // Four corners in counter-clockwise order (seen from outside) -> two triangles.
  function quad(a, b, c, d, color, glow) {
    triangle(a, b, c, color, glow);
    triangle(a, c, d, color, glow);
  }

  // A box centered at (x, y, z). shade darkens the bottom a touch for a hand-painted feel.
  function box(x, y, z, width, height, depth, color, glow = 0) {
    const x0 = x - width / 2, x1 = x + width / 2;
    const y0 = y - height / 2, y1 = y + height / 2;
    const z0 = z - depth / 2, z1 = z + depth / 2;
    quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], color, glow);       // top
    quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], color, glow);       // bottom
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], color, glow);       // front (+z)
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], color, glow);       // back (-z)
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], color, glow);       // right (+x)
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], color, glow);       // left (-x)
  }

  // A cone (sides = 5 to 8 looks properly low-poly). Base centered at (x, y, z).
  function cone(x, y, z, radius, height, sides, color, glow = 0) {
    for (let i = 0; i < sides; i++) {
      const a1 = (i / sides) * Math.PI * 2;
      const a2 = ((i + 1) / sides) * Math.PI * 2;
      const p1 = [x + Math.cos(a1) * radius, y, z + Math.sin(a1) * radius];
      const p2 = [x + Math.cos(a2) * radius, y, z + Math.sin(a2) * radius];
      // A cone pointing DOWN (negative height) is inside-out, so wind it the other way.
      if (height >= 0) {
        triangle(p2, p1, [x, y + height, z], color, glow);   // side
        triangle(p1, p2, [x, y, z], color, glow);            // base
      } else {
        triangle(p1, p2, [x, y + height, z], color, glow);
        triangle(p2, p1, [x, y, z], color, glow);
      }
    }
  }

  function cylinder(x, y, z, radius, height, sides, color, glow = 0) {
    for (let i = 0; i < sides; i++) {
      const a1 = (i / sides) * Math.PI * 2;
      const a2 = ((i + 1) / sides) * Math.PI * 2;
      const c1 = Math.cos(a1) * radius, s1 = Math.sin(a1) * radius;
      const c2 = Math.cos(a2) * radius, s2 = Math.sin(a2) * radius;
      quad([x + c2, y, z + s2], [x + c1, y, z + s1], [x + c1, y + height, z + s1], [x + c2, y + height, z + s2], color, glow);
      triangle([x + c1, y + height, z + s1], [x, y + height, z], [x + c2, y + height, z + s2], color, glow);
      triangle([x + c2, y, z + s2], [x, y, z], [x + c1, y, z + s1], color, glow);
    }
  }

  // A lumpy ball: an octahedron split once, each corner pushed in or out at random.
  function rock(x, y, z, radius, color, seed = 1) {
    const random = createRandom(seed);
    const top = [0, 1, 0], bottom = [0, -1, 0];
    const ring = [[1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, 0, 1]];
    const jitter = new Map();
    function place(point) {
      const key = point.map((value) => value.toFixed(3)).join(",");
      if (!jitter.has(key)) jitter.set(key, radius * random.range(0.75, 1.15));
      const size = Math.hypot(point[0], point[1], point[2]);
      const length = jitter.get(key) / size;
      return [x + point[0] * length, y + point[1] * length * 0.75, z + point[2] * length];
    }
    function middle(a, b) {
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    }
    for (let i = 0; i < 4; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % 4];
      for (const [pole, flip] of [[top, false], [bottom, true]]) {
        // Split each of the 8 faces into 4 smaller triangles.
        const ab = middle(a, b), ap = middle(a, pole), bp = middle(b, pole);
        const faces = [[a, ab, ap], [ab, b, bp], [ap, bp, pole], [ab, bp, ap]];
        for (const [p, q, r] of faces) {
          // Face the triangle outward: top half and bottom half wind opposite ways.
          if (flip) triangle(place(p), place(r), place(q), color);
          else triangle(place(p), place(q), place(r), color);
        }
      }
    }
  }

  function data() {
    return { positions, normals, extras };
  }

  return { triangle, quad, box, cone, cylinder, rock, data };
}

// Ready-made props. Colors are 0..1 sRGB, the same as a CSS color divided by 255.
export const lowPolyColors = {
  trunk: [0.45, 0.31, 0.2],
  pine: [0.2, 0.48, 0.32],
  pineLight: [0.3, 0.6, 0.36],
  leaf: [0.42, 0.68, 0.3],
  rock: [0.55, 0.56, 0.6],
  gold: [1.0, 0.78, 0.25],
  crystal: [0.45, 0.85, 1.0],
};

export function pineTree(height = 3) {
  const builder = createModelBuilder();
  builder.cylinder(0, 0, 0, 0.15, height * 0.3, 6, lowPolyColors.trunk);
  builder.cone(0, height * 0.25, 0, height * 0.32, height * 0.45, 7, lowPolyColors.pine);
  builder.cone(0, height * 0.5, 0, height * 0.25, height * 0.4, 7, lowPolyColors.pineLight);
  builder.cone(0, height * 0.72, 0, height * 0.16, height * 0.32, 7, lowPolyColors.pine);
  return builder.data();
}

export function roundTree(seed = 1) {
  const builder = createModelBuilder();
  builder.cylinder(0, 0, 0, 0.14, 1.2, 6, lowPolyColors.trunk);
  builder.rock(0, 1.7, 0, 0.9, lowPolyColors.leaf, seed);
  builder.rock(0.45, 1.4, 0.2, 0.55, lowPolyColors.leaf, seed + 1);
  return builder.data();
}

export function rockModel(seed = 1, size = 0.6) {
  const builder = createModelBuilder();
  builder.rock(0, size * 0.4, 0, size, lowPolyColors.rock, seed);
  return builder.data();
}

// A coin: a short 10-sided cylinder, turned to stand on its edge. glow keeps it bright.
export function coinModel() {
  const coin = createModelBuilder();
  coin.cylinder(0, -0.05, 0, 0.35, 0.1, 10, lowPolyColors.gold, 0.15);
  const flat = coin.data();
  // Turn it upright: a quarter turn about the x axis maps (x, y, z) to (x, z, -y).
  // Turning never changes which way triangles wind, so nothing turns inside out.
  const upright = { positions: [], normals: [], extras: flat.extras };
  for (let i = 0; i < flat.positions.length; i += 3) {
    upright.positions.push(flat.positions[i], flat.positions[i + 2], -flat.positions[i + 1]);
    upright.normals.push(flat.normals[i], flat.normals[i + 2], -flat.normals[i + 1]);
  }
  return upright;
}

// A crystal: two five-sided cones, one up, one down.
export function crystalModel() {
  const builder = createModelBuilder();
  builder.cone(0, 0, 0, 0.3, 0.6, 5, lowPolyColors.crystal, 0.6);
  builder.cone(0, 0, 0, 0.3, -0.45, 5, lowPolyColors.crystal, 0.6);
  return builder.data();
}

// A blocky character as separate parts, so arms and legs can swing.
// Each part's mesh hangs from its pivot (shoulder or hip) at (0, 0, 0).
// colors: { skin, shirt, pants, shoes }
export function blockyCharacter(colors = {}) {
  const skin = colors.skin || [0.98, 0.8, 0.55];
  const shirt = colors.shirt || [0.25, 0.55, 0.95];
  const pants = colors.pants || [0.22, 0.25, 0.35];
  const shoes = colors.shoes || [0.15, 0.12, 0.1];
  function part(build) {
    const builder = createModelBuilder();
    build(builder);
    return builder.data();
  }
  return {
    torso: { pivot: [0, 0.75, 0], data: part((b) => b.box(0, 0.35, 0, 0.6, 0.7, 0.32, shirt)) },
    head: {
      pivot: [0, 1.45, 0],
      data: part((b) => {
        b.box(0, 0.25, 0, 0.5, 0.5, 0.5, skin);
        b.box(-0.12, 0.28, 0.255, 0.08, 0.1, 0.02, [0.1, 0.1, 0.12]);   // eyes
        b.box(0.12, 0.28, 0.255, 0.08, 0.1, 0.02, [0.1, 0.1, 0.12]);
        b.box(0, 0.12, 0.255, 0.2, 0.05, 0.02, [0.55, 0.3, 0.25]);      // smile
      }),
    },
    leftArm: { pivot: [-0.4, 1.4, 0], data: part((b) => { b.box(0, -0.25, 0, 0.2, 0.5, 0.24, shirt); b.box(0, -0.6, 0, 0.18, 0.2, 0.22, skin); }) },
    rightArm: { pivot: [0.4, 1.4, 0], data: part((b) => { b.box(0, -0.25, 0, 0.2, 0.5, 0.24, shirt); b.box(0, -0.6, 0, 0.18, 0.2, 0.22, skin); }) },
    leftLeg: { pivot: [-0.15, 0.75, 0], data: part((b) => { b.box(0, -0.3, 0, 0.26, 0.6, 0.28, pants); b.box(0, -0.68, 0.03, 0.26, 0.14, 0.34, shoes); }) },
    rightLeg: { pivot: [0.15, 0.75, 0], data: part((b) => { b.box(0, -0.3, 0, 0.26, 0.6, 0.28, pants); b.box(0, -0.68, 0.03, 0.26, 0.14, 0.34, shoes); }) },
  };
}
