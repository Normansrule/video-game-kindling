// tests/checks/2d.checks.js
// WHAT: Checks for collision, SAT, physics, tilemap, camera, animation and particles.
// DOC:  docs/modules/collision.md, physics.md, tilemap.md, camera.md

import { expect, expectClose } from "./expect.js";
import * as collision from "../../engine/2d/collision.js";
import { createBoxPolygon, createPolygon, polygonsCollide, polygonCircleCollide } from "../../engine/2d/sat.js";
import { createBody, moveAndCollide, createSolids, keepInside, bounceCircles } from "../../engine/2d/physics.js";
import { createTilemap } from "../../engine/2d/tilemap.js";
import { createCamera } from "../../engine/2d/camera.js";
import { createAnimation, createAnimator } from "../../engine/2d/animation.js";
import { createParticles } from "../../engine/2d/particles.js";

const box = (x, y, width, height) => ({ x, y, width, height });

export const twoDChecks = [
  { name: "AABB overlap, and touching edges do NOT count", run() {
    expect(collision.rectsOverlap(box(0, 0, 10, 10), box(5, 5, 10, 10)), "should overlap");
    expect(!collision.rectsOverlap(box(0, 0, 10, 10), box(10, 0, 10, 10)), "edges touching should not overlap");
  } },
  { name: "AABB push-out picks the shallow side", run() {
    const push = collision.rectPushOut(box(0, 0, 10, 10), box(8, -20, 10, 50));
    expect(push.x === -2 && push.y === 0, JSON.stringify(push));
  } },
  { name: "circle vs circle push-out separates exactly", run() {
    const a = { x: 0, y: 0, radius: 5 };
    const b = { x: 8, y: 0, radius: 5 };
    const push = collision.circlePushOut(a, b);
    expectClose(push.x, -2);
    expect(collision.circlePushOut({ x: 0, y: 0, radius: 1 }, { x: 5, y: 0, radius: 1 }) === null, "apart should be null");
  } },
  { name: "circle vs rect: corner case and inside case", run() {
    expect(!collision.circleRectOverlap({ x: -3, y: -3, radius: 4 }, box(0, 0, 10, 10)), "corner: 4.24 away, radius 4");
    expect(collision.circleRectOverlap({ x: -2, y: -2, radius: 4 }, box(0, 0, 10, 10)), "corner: 2.83 away");
    const push = collision.circleRectPushOut({ x: 1, y: 5, radius: 2 }, box(0, 0, 10, 10));
    expect(push && push.x < 0, "inside near left side should push left: " + JSON.stringify(push));
  } },
  { name: "ray hits the near side of a box", run() {
    const distance = collision.rayRect({ x: 0, y: 5 }, { x: 1, y: 0 }, box(10, 0, 10, 10));
    expectClose(distance, 10);
    expect(collision.rayRect({ x: 0, y: 50 }, { x: 1, y: 0 }, box(10, 0, 10, 10)) === null, "miss");
  } },
  { name: "SAT: rotated boxes apart vs touching", run() {
    const a = createBoxPolygon(10, 10, 0, 0, 0);
    const b = createBoxPolygon(10, 10, 11, 0, 0);
    expect(polygonsCollide(a, b) === null, "11 apart, should miss");
    b.rotation = Math.PI / 4;   // corner now reaches 11 - 7.07 = 3.93 < 5
    const hit = polygonsCollide(a, b);
    expect(hit !== null && hit.normal.x < 0, "rotated corner should hit and push A left: " + JSON.stringify(hit));
  } },
  { name: "SAT: triangle vs circle", run() {
    const triangle = createPolygon([{ x: 0, y: -10 }, { x: 10, y: 10 }, { x: -10, y: 10 }], 0, 0, 0);
    expect(polygonCircleCollide(triangle, { x: 0, y: 14, radius: 5 }) !== null, "circle below base touches");
    expect(polygonCircleCollide(triangle, { x: 0, y: 30, radius: 5 }) === null, "far circle misses");
  } },
  { name: "physics: a falling body lands on the floor", run() {
    const body = createBody({ x: 0, y: 0, width: 10, height: 10, gravity: 900 });
    const world = createSolids([box(-50, 40, 200, 10)]);
    for (let i = 0; i < 120; i++) moveAndCollide(body, 1 / 60, world);
    expectClose(body.y, 30, 1e-6, "y");
    expect(body.onGround && body.velocityY === 0, "should rest on ground");
  } },
  { name: "physics: one-way platform lets you jump up through it", run() {
    const body = createBody({ x: 0, y: 30, width: 10, height: 10, velocityY: -300 });
    const world = createSolids([{ x: -10, y: 20, width: 40, height: 4, oneWay: true }]);
    moveAndCollide(body, 1 / 60, world);
    expect(body.y < 30 && !body.touching.top, "should pass through from below");
  } },
  { name: "physics: keepInside bounces", run() {
    const body = createBody({ x: 95, y: 0, width: 10, height: 10, velocityX: 100, bounce: 1 });
    const hit = keepInside(body, box(0, 0, 100, 100));
    expect(hit.right && body.velocityX === -100 && body.x === 90, JSON.stringify(body));
  } },
  { name: "physics: equal circles swap velocities head-on", run() {
    const a = { x: 0, y: 0, radius: 5, velocityX: 10, velocityY: 0 };
    const b = { x: 9, y: 0, radius: 5, velocityX: -10, velocityY: 0 };
    bounceCircles(a, b, 1);
    expectClose(a.velocityX, -10);
    expectClose(b.velocityX, 10);
  } },
  { name: "tilemap: get, find, solidsNear, outside is solid", run() {
    const map = createTilemap({ tileSize: 10, rows: ["####", "#P.#", "####"] });
    expect(map.get(1, 1) === "P" && map.get(9, 9) === null, "get");
    expect(map.find("P")[0].x === 10, "find");
    expect(map.isSolid(-1, 0), "outside counts as solid");
    const near = map.solidsNear(box(10, 10, 10, 10));
    expect(near.length === 0, "the P tile itself is not solid");
    expect(map.solidsNear(box(5, 5, 10, 10)).length === 3, "3 wall tiles touch that box");
  } },
  { name: "tilemap as a physics world", run() {
    const map = createTilemap({ tileSize: 10, rows: ["#....#", "#....#", "######"] });
    const body = createBody({ x: 20, y: 0, width: 8, height: 8, gravity: 900 });
    for (let i = 0; i < 60; i++) moveAndCollide(body, 1 / 60, map);
    expectClose(body.y, 12, 1e-6, "lands on row 2 (y = 20) minus height 8");
  } },
  { name: "camera: stays inside bounds and converts coordinates", run() {
    const camera = createCamera({ width: 100, height: 50, bounds: box(0, 0, 400, 200), smoothing: 0 });
    camera.follow({ x: 5, y: 5 }, 1 / 60);
    expect(camera.x === 0 && camera.y === 0, "clamped to top-left");
    camera.follow({ x: 1000, y: 1000 }, 1 / 60);
    expect(camera.x === 300 && camera.y === 150, "clamped to bottom-right: " + camera.x + "," + camera.y);
    const screen = camera.worldToScreen(310, 160);
    expect(screen.x === 10 && screen.y === 10, "worldToScreen");
  } },
  { name: "animation: loops, and the animator doesn't restart the same clip", run() {
    const run = createAnimation([4, 5, 6], 10);
    run.update(0.25);   // 2.5 frames in
    expect(run.frame() === 6, "frame " + run.frame());
    run.update(0.1);    // 3.5 -> wraps to index 0
    expect(run.frame() === 4, "wrap " + run.frame());
    const animator = createAnimator({ idle: createAnimation([0], 1), run });
    animator.play("run");
    animator.update(0.15);
    animator.play("run");
    expect(animator.frame() === 5, "should keep playing, got " + animator.frame());
  } },
  { name: "particles: emit, age out, pool limit", run() {
    const particles = createParticles(5);
    particles.emit({ x: 0, y: 0, count: 8, lifeMin: 0.5, lifeMax: 0.5 });
    expect(particles.count() === 5, "pool caps at 5, got " + particles.count());
    particles.update(0.6);
    expect(particles.count() === 0, "all should die after their life");
  } },
];
