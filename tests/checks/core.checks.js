// tests/checks/core.checks.js
// WHAT: Checks for the loop, time, events, scenes, tweens and timers (no browser needed).
// DOC:  docs/modules/core.md

import { expect, expectClose } from "./expect.js";
import { createLoop } from "../../engine/core/loop.js";
import { createEvents } from "../../engine/core/events.js";
import { createSceneManager } from "../../engine/core/scene.js";
import { createTweens, createTimers } from "../../engine/core/tween.js";

export const coreChecks = [
  { name: "loop runs a fixed number of steps for the time given", run() {
    let updates = 0;
    // Steps of 1/64 s are exact in binary floating point, so the counts are exact too.
    // (0.01 is not exact: 0.25 - 0.01 * 24 leaves 0.00999..., one step short.)
    const step = 1 / 64;
    const loop = createLoop({ update() { updates++; }, stepSeconds: step });
    loop.advance(3.5 * step);            // 3 steps, half a step left over
    expect(updates === 3, "expected 3 updates, got " + updates);
    expectClose(loop.time.alpha, 0.5, 1e-6, "alpha");
    loop.advance(0.5 * step);            // leftover + half a step = one more step
    expect(updates === 4, "expected 4 updates, got " + updates);
  } },
  { name: "loop clamps a huge frame (no spiral of death)", run() {
    let updates = 0;
    const loop = createLoop({ update() { updates++; }, stepSeconds: 1 / 64, maxFrameSeconds: 0.25 });
    loop.advance(10);                    // clamped to 0.25 s = 16 steps
    expect(updates === 16, "expected 16 updates, got " + updates);
  } },
  { name: "loop time.scale 0 pauses updates", run() {
    let updates = 0;
    const loop = createLoop({ update() { updates++; }, stepSeconds: 0.01 });
    loop.time.scale = 0;
    loop.advance(0.1);
    expect(updates === 0, "paused loop updated");
  } },
  { name: "events: on, once, off", run() {
    const events = createEvents();
    let total = 0;
    const unsubscribe = events.on("coin", (value) => { total += value; });
    events.once("coin", (value) => { total += value * 100; });
    events.emit("coin", 1);
    events.emit("coin", 1);
    unsubscribe();
    events.emit("coin", 1);
    expect(total === 102, "total was " + total);
  } },
  { name: "scenes: switchTo calls exit then enter with data", run() {
    const log = [];
    const scenes = createSceneManager({});
    scenes.add("title", { enter() { log.push("title-enter"); }, exit() { log.push("title-exit"); } });
    scenes.add("play", { enter(game, data) { log.push("play-enter-" + data.level); } });
    scenes.switchTo("title");
    scenes.switchTo("play", { level: 2 });
    expect(log.join() === "title-enter,title-exit,play-enter-2", log.join());
    expect(scenes.currentName() === "play", "current scene");
  } },
  { name: "scenes: push pauses the scene below, pop resumes it", run() {
    const updated = [];
    const scenes = createSceneManager({});
    scenes.add("play", { update() { updated.push("play"); } });
    scenes.add("pause", { update() { updated.push("pause"); } });
    scenes.switchTo("play");
    scenes.update(1);
    scenes.push("pause");
    scenes.update(1);
    scenes.pop();
    scenes.update(1);
    expect(updated.join() === "play,pause,play", updated.join());
  } },
  { name: "tweens reach the goal and call onDone", run() {
    const box = { x: 0 };
    const tweens = createTweens();
    let done = false;
    tweens.to(box, { x: 10 }, 1).onDone = () => { done = true; };
    tweens.update(0.5);
    expectClose(box.x, 5);
    tweens.update(0.6);
    expectClose(box.x, 10);
    expect(done && tweens.count() === 0, "tween did not finish");
  } },
  { name: "timers: after fires once, every repeats", run() {
    const timers = createTimers();
    let once = 0;
    let repeated = 0;
    timers.after(0.5, () => once++);
    timers.every(0.25, () => repeated++);
    for (let i = 0; i < 10; i++) timers.update(0.1);   // 1 second
    expect(once === 1, "after fired " + once);
    expect(repeated === 4, "every fired " + repeated);
  } },
];
