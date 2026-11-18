// tests/checks/math.checks.js
// WHAT: Checks for scalar, vec2, vec3, mat4, quat, random and easing.
// DOC:  docs/modules/math.md

import { expect, expectClose } from "./expect.js";
import { clamp, lerp, remap, approach, wrap, inverseLerp } from "../../engine/math/scalar.js";
import * as vec2 from "../../engine/math/vec2.js";
import * as vec3 from "../../engine/math/vec3.js";
import * as mat4 from "../../engine/math/mat4.js";
import * as quat from "../../engine/math/quat.js";
import { createRandom } from "../../engine/math/random.js";
import { easings } from "../../engine/math/easing.js";

export const mathChecks = [
  { name: "clamp, lerp, remap, inverseLerp", run() {
    expect(clamp(5, 0, 3) === 3 && clamp(-1, 0, 3) === 0 && clamp(2, 0, 3) === 2, "clamp");
    expectClose(lerp(10, 20, 0.25), 12.5);
    expectClose(remap(5, 0, 10, 100, 200), 150);
    expectClose(inverseLerp(10, 20, 15), 0.5);
  } },
  { name: "approach never overshoots", run() {
    expectClose(approach(0, 10, 3), 3);
    expectClose(approach(9, 10, 3), 10);
    expectClose(approach(-2, -10, 100), -10);
  } },
  { name: "wrap handles negatives", run() {
    expectClose(wrap(370, 0, 360), 10);
    expectClose(wrap(-30, 0, 360), 330);
  } },
  { name: "vec2 basics do not change inputs", run() {
    const a = vec2.create(3, 4);
    const b = vec2.add(a, vec2.create(1, 1));
    expect(a.x === 3 && a.y === 4, "input changed");
    expect(b.x === 4 && b.y === 5, "add");
    expectClose(vec2.length(a), 5);
    expectClose(vec2.length(vec2.normalize(a)), 1);
    expect(vec2.length(vec2.normalize(vec2.create(0, 0))) === 0, "zero normalize must stay 0");
  } },
  { name: "vec2 rotate 90 degrees", run() {
    const rotated = vec2.rotate(vec2.create(1, 0), Math.PI / 2);
    expect(vec2.equals(rotated, vec2.create(0, 1)), "got " + JSON.stringify(rotated));
  } },
  { name: "vec2 dot, cross, limit", run() {
    expectClose(vec2.dot(vec2.create(1, 0), vec2.create(0, 1)), 0);
    expectClose(vec2.cross(vec2.create(1, 0), vec2.create(0, 1)), 1);
    expectClose(vec2.length(vec2.limit(vec2.create(30, 40), 5)), 5);
  } },
  { name: "vec3 cross of x and y is z", run() {
    const z = vec3.cross(vec3.create(1, 0, 0), vec3.create(0, 1, 0));
    expect(vec3.equals(z, vec3.create(0, 0, 1)), "got " + JSON.stringify(z));
  } },
  { name: "mat4 identity times matrix is the matrix", run() {
    const m = mat4.translation(1, 2, 3);
    const result = mat4.multiply(mat4.identity(), m);
    for (let i = 0; i < 16; i++) expectClose(result[i], m[i]);
  } },
  { name: "mat4 translate then transform a point", run() {
    const point = mat4.transformPoint(mat4.translation(5, 0, 0), { x: 1, y: 1, z: 1 });
    expect(vec3.equals(point, { x: 6, y: 1, z: 1 }), JSON.stringify(point));
  } },
  { name: "mat4 rotationZ(90) turns x into y", run() {
    const point = mat4.transformPoint(mat4.rotationZ(Math.PI / 2), { x: 1, y: 0, z: 0 });
    expect(vec3.equals(point, { x: 0, y: 1, z: 0 }), JSON.stringify(point));
  } },
  { name: "mat4 invert undoes the matrix", run() {
    const m = mat4.multiply(mat4.translation(3, -2, 7), mat4.multiply(mat4.rotationY(0.7), mat4.scaling(2, 3, 4)));
    const product = mat4.multiply(m, mat4.invert(m));
    const id = mat4.identity();
    for (let i = 0; i < 16; i++) expectClose(product[i], id[i], 1e-4, "index " + i);
  } },
  { name: "mat4 lookAt puts the target straight ahead (-z)", run() {
    const view = mat4.lookAt({ x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
    const target = mat4.transformPoint(view, { x: 0, y: 0, z: 0 });
    expect(vec3.equals(target, { x: 0, y: 0, z: -5 }, 1e-5), JSON.stringify(target));
  } },
  { name: "mat4 perspective maps near plane to -1 and far plane to +1", run() {
    const projection = mat4.perspective(Math.PI / 2, 1, 1, 10);
    expectClose(mat4.transformPoint(projection, { x: 0, y: 0, z: -1 }).z, -1, 1e-5, "near");
    expectClose(mat4.transformPoint(projection, { x: 0, y: 0, z: -10 }).z, 1, 1e-5, "far");
  } },
  { name: "quat rotates and matches mat4", run() {
    const q = quat.fromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);
    const rotated = quat.rotateVector(q, { x: 1, y: 0, z: 0 });
    expect(vec3.equals(rotated, { x: 0, y: 1, z: 0 }, 1e-5), JSON.stringify(rotated));
    const fromMatrix = mat4.transformPoint(mat4.fromQuat(q), { x: 1, y: 0, z: 0 });
    expect(vec3.equals(fromMatrix, rotated, 1e-5), "fromQuat disagrees");
  } },
  { name: "quat slerp halfway is half the angle", run() {
    const a = quat.identity();
    const b = quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2);
    const half = quat.slerp(a, b, 0.5);
    const expected = quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 4);
    expectClose(half.y, expected.y);
    expectClose(half.w, expected.w);
  } },
  { name: "random: same seed, same numbers; int includes both ends", run() {
    const first = createRandom(42);
    const second = createRandom(42);
    for (let i = 0; i < 10; i++) expect(first.next() === second.next(), "seed not repeatable");
    const dice = createRandom(7);
    const seen = new Set();
    for (let i = 0; i < 500; i++) seen.add(dice.int(1, 6));
    expect(seen.size === 6 && seen.has(1) && seen.has(6), "int range wrong: " + Array.from(seen));
  } },
  { name: "random shuffle keeps every item", run() {
    const shuffled = createRandom(1).shuffle([1, 2, 3, 4, 5]);
    expect(shuffled.slice().sort().join() === "1,2,3,4,5", shuffled.join());
  } },
  { name: "every easing starts at 0 and ends at 1", run() {
    for (const name in easings) {
      expectClose(easings[name](0), 0, 1e-3, name + "(0)");
      expectClose(easings[name](1), 1, 1e-3, name + "(1)");
    }
  } },
];
