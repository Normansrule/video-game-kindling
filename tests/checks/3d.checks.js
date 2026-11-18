// tests/checks/3d.checks.js
// WHAT: Checks for primitives (triangle winding), the OBJ parser and the raycaster.
//       The GPU parts (gl.js, shader.js, mesh.js) are checked by the smoke test instead.
// DOC:  docs/modules/3d.md

import { expect, expectClose } from "./expect.js";
import { box, plane, sphere } from "../../engine/3d/primitives.js";
import { parseOBJ } from "../../engine/3d/obj.js";
import { castRay, castRays, moveInGrid } from "../../engine/3d/raycaster.js";
import { boxesOverlap, createBody3D, moveAndCollide3D, rayBox, boxFromCenter } from "../../engine/3d/collision3d.js";

// Every triangle of a closed shape centered on the origin should face outward:
// its cross-product normal should point away from the center.
function inwardTriangles(data) {
  let bad = 0;
  const p = data.positions;
  for (let i = 0; i < data.indices.length; i += 3) {
    const [a, b, c] = [data.indices[i] * 3, data.indices[i + 1] * 3, data.indices[i + 2] * 3];
    const e1 = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
    const e2 = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
    const n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const center = [(p[a] + p[b] + p[c]) / 3, (p[a + 1] + p[b + 1] + p[c + 1]) / 3, (p[a + 2] + p[b + 2] + p[c + 2]) / 3];
    if (n[0] * center[0] + n[1] * center[1] + n[2] * center[2] <= 0) bad++;
  }
  return bad;
}

const triangleOBJ = `
# a square made of two triangles, then a quad
v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0
vt 0 0
vt 1 0
vt 1 1
vt 0 1
vn 0 0 1
f 1/1/1 2/2/1 3/3/1
f 1/1/1 3/3/1 4/4/1
f 1 2 3 4
`;

const MAP = [
  "#####",
  "#...#",
  "#...#",
  "#####",
];

export const threeDChecks = [
  { name: "box: 24 corners, 12 triangles, all facing outward", run() {
    const data = box(2, 1, 3);
    expect(data.positions.length === 24 * 3 && data.indices.length === 36, "sizes");
    expect(inwardTriangles(data) === 0, inwardTriangles(data) + " triangles face inward");
  } },
  { name: "sphere: triangles face outward and normals have length 1", run() {
    const data = sphere(1, 12, 8);
    expect(inwardTriangles(data) === 0, inwardTriangles(data) + " triangles face inward");
    expectClose(Math.hypot(data.normals[30], data.normals[31], data.normals[32]), 1);
  } },
  { name: "plane: triangles face up (+y)", run() {
    const data = plane(4, 4, 2);
    const p = data.positions;
    const [a, b, c] = [data.indices[0] * 3, data.indices[1] * 3, data.indices[2] * 3];
    const e1 = [p[b] - p[a], p[b + 2] - p[a + 2]];
    const e2 = [p[c] - p[a], p[c + 2] - p[a + 2]];
    // y part of the cross product: z1 * x2 - x1 * z2
    expect(e1[1] * e2[0] - e1[0] * e2[1] > 0, "first triangle faces down");
  } },
  { name: "OBJ: shared corners are reused, quads become two triangles", run() {
    const data = parseOBJ(triangleOBJ);
    expect(data.indices.length === 12, "expected 4 triangles, got " + data.indices.length / 3);
    expect(data.positions.length / 3 === 8, "4 textured corners + 4 plain corners, got " + data.positions.length / 3);
  } },
  { name: "OBJ: missing normals are computed", run() {
    const data = parseOBJ("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n");
    expectClose(data.normals[2], 1, 1e-6, "normal z");
  } },
  { name: "raycaster: ray straight right hits the wall 2.5 cells away", run() {
    const hit = castRay(MAP, 1.5, 1.5, 0);
    expectClose(hit.distance, 2.5);
    expect(hit.side === "x" && hit.column === 4, JSON.stringify(hit));
  } },
  { name: "raycaster: fisheye fix makes a flat wall the same distance across the view", run() {
    const room = ["#####", "#...#", "#...#", "#...#", "#...#", "#...#", "#####"];
    const hits = castRays(room, { x: 1.5, y: 3.5, angle: 0 }, Math.PI / 3, 5, true);
    expectClose(hits[0].distance, hits[4].distance, 1e-6, "edges");
    expectClose(hits[0].distance, 2.5, 1e-6, "perpendicular distance");
  } },
  { name: "raycaster: moveInGrid slides along walls", run() {
    const player = { x: 1.5, y: 1.5 };
    moveInGrid(MAP, player, -1, 0.3);   // into the left wall, and down
    expect(player.x === 1.5 && Math.abs(player.y - 1.8) < 1e-9, JSON.stringify(player));
  } },
  { name: "collision3d: boxes overlap, touching faces do not", run() {
    const a = { x: 0, y: 0, z: 0, width: 1, height: 1, depth: 1 };
    expect(boxesOverlap(a, { x: 0.5, y: 0.5, z: 0.5, width: 1, height: 1, depth: 1 }), "overlap");
    expect(!boxesOverlap(a, { x: 1, y: 0, z: 0, width: 1, height: 1, depth: 1 }), "touching");
  } },
  { name: "collision3d: a falling body lands on a floor and stops at a wall", run() {
    const floor = boxFromCenter(0, -0.5, 0, 10, 1, 10);
    const wall = boxFromCenter(2, 1, 0, 1, 2, 10);
    const body = createBody3D({ x: 0, y: 2, z: 0, width: 0.5, height: 1, depth: 0.5 });
    body.velocityX = 3;
    for (let i = 0; i < 120; i++) moveAndCollide3D(body, 1 / 60, [floor, wall]);
    expect(body.onGround && Math.abs(body.y) < 1e-9, "on floor y=" + body.y);
    expectClose(body.x + body.width, 1.5, 1e-9, "against wall");
  } },
  { name: "collision3d: rayBox hits at the right distance and misses", run() {
    const target = boxFromCenter(0, 0, -5, 2, 2, 2);
    expectClose(rayBox({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, target), 4, 1e-9, "hit");
    expect(rayBox({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, target) === null, "behind");
    expect(rayBox({ x: 3, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, target) === null, "beside");
  } },
];
