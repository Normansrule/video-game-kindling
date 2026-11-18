// engine/core/loop.js
// WHAT: The fixed-timestep game loop.
// WHY:  The screen redraws at whatever rate the monitor likes (60, 120, 144 Hz...).
//       If we moved things "once per frame", the game would run faster on fast screens.
//       Instead we collect real time in an "accumulator" and run update() in FIXED
//       slices (default 1/60 s). Physics then behaves the same on every machine.
//       render() gets `alpha` (0..1) = how far we are toward the next step, so it can
//       blend positions for smooth motion. Based on Glenn Fiedler's "Fix Your Timestep!".
// DOC:  docs/modules/core.md   VIZ: viz/01-game-loop/

import { createTime } from "./time.js";

// options.update(stepSeconds)  - move the game forward by exactly one step
// options.render(alpha)        - draw the game (alpha = 0..1 between steps)
// options.stepSeconds          - size of one update step (default 1/60)
// options.maxFrameSeconds      - longest frame we accept; stops the "spiral of death"
//                                after a long pause or a breakpoint (default 0.25)
export function createLoop(options) {
  const update = options.update;
  const render = options.render || function () {};
  const maxFrameSeconds = options.maxFrameSeconds || 0.25;
  const time = options.time || createTime(options.stepSeconds || 1 / 60);

  let accumulator = 0;          // real seconds waiting to be simulated
  let lastTimestamp = null;     // milliseconds, from requestAnimationFrame
  let running = false;
  let frameRequest = 0;

  // The heart of the loop, separated from requestAnimationFrame so tests and
  // the visualization can call it with made-up frame times.
  function advance(frameSeconds) {
    // Never simulate more than maxFrameSeconds at once.
    const clamped = Math.min(frameSeconds, maxFrameSeconds);
    accumulator = accumulator + clamped * time.scale;

    let stepsThisFrame = 0;
    while (accumulator >= time.step) {
      update(time.step);
      time.recordStep();
      accumulator = accumulator - time.step;
      stepsThisFrame = stepsThisFrame + 1;
    }

    time.stepsThisFrame = stepsThisFrame;
    time.alpha = accumulator / time.step;
    time.recordFrame(frameSeconds);
    render(time.alpha);
    return stepsThisFrame;
  }

  function onAnimationFrame(timestamp) {
    if (!running) return;
    if (lastTimestamp === null) lastTimestamp = timestamp;
    const frameSeconds = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    advance(frameSeconds);
    frameRequest = requestAnimationFrame(onAnimationFrame);
  }

  function start() {
    if (running) return;
    running = true;
    lastTimestamp = null;
    frameRequest = requestAnimationFrame(onAnimationFrame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(frameRequest);
  }

  function isRunning() {
    return running;
  }

  function getAccumulator() {
    return accumulator;
  }

  return { start, stop, isRunning, advance, time, getAccumulator };
}
