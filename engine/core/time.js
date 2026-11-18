// engine/core/time.js
// WHAT: Keeps track of game time: total seconds, step size, frame count and frames per second.
// WHY:  Games measure everything in seconds, never in frames, so they run the same
//       speed on a 60 Hz laptop and a 144 Hz monitor. This object is the one place
//       that knows "what time is it in the game?".
// DOC:  docs/modules/core.md   VIZ: viz/01-game-loop/

export function createTime(stepSeconds = 1 / 60) {
  const time = {
    step: stepSeconds,    // seconds per update step (fixed)
    elapsed: 0,           // total game seconds simulated so far
    steps: 0,             // number of update steps run so far
    frames: 0,            // number of frames drawn so far
    stepsThisFrame: 0,    // how many updates ran before the last draw (0, 1, 2...)
    alpha: 0,             // how far between two steps the last draw was (0..1)
    fps: 0,               // measured frames per second, refreshed twice a second
    scale: 1,             // 0.5 = slow motion, 0 = paused, 2 = fast forward
  };

  // Private counters for the fps measurement.
  let framesInWindow = 0;
  let secondsInWindow = 0;

  // Called by the loop once per drawn frame, with the real seconds since the last frame.
  time.recordFrame = function recordFrame(realSeconds) {
    time.frames = time.frames + 1;
    framesInWindow = framesInWindow + 1;
    secondsInWindow = secondsInWindow + realSeconds;
    if (secondsInWindow >= 0.5) {
      time.fps = Math.round(framesInWindow / secondsInWindow);
      framesInWindow = 0;
      secondsInWindow = 0;
    }
  };

  // Called by the loop once per update step.
  time.recordStep = function recordStep() {
    time.steps = time.steps + 1;
    time.elapsed = time.elapsed + time.step;
  };

  return time;
}
