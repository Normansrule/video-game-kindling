// engine/2d/animation.js
// WHAT: Frame-by-frame animation: which sprite-sheet frame to show at each moment.
// WHY:  "Run" is frames [8, 9, 10, 11] at 12 frames per second, looping.
//       An animator swaps between named animations (idle, run, jump) without
//       restarting the one that is already playing.
// DOC:  docs/modules/2d.md   VIZ: viz/03-sprites/

// frames: list of sprite-sheet frame numbers. framesPerSecond: playback speed.
export function createAnimation(frames, framesPerSecond = 10, loop = true) {
  const animation = {
    frames,
    framesPerSecond,
    loop,
    elapsed: 0,
    finished: false,
  };

  animation.update = function update(stepSeconds) {
    animation.elapsed = animation.elapsed + stepSeconds;
    const totalSeconds = frames.length / animation.framesPerSecond;
    if (!loop && animation.elapsed >= totalSeconds) animation.finished = true;
  };

  // The frame number to draw right now.
  animation.frame = function frame() {
    let index = Math.floor(animation.elapsed * animation.framesPerSecond);
    if (loop) index = index % frames.length;
    else index = Math.min(index, frames.length - 1);
    return frames[index];
  };

  animation.reset = function reset() {
    animation.elapsed = 0;
    animation.finished = false;
  };

  return animation;
}

// animations: { idle: createAnimation(...), run: createAnimation(...) }
export function createAnimator(animations, startName) {
  let currentName = startName || Object.keys(animations)[0];

  return {
    // Switch animation. Playing the current one again does NOT restart it.
    play(name) {
      if (!animations[name]) throw new Error("No animation called '" + name + "'");
      if (name === currentName) return;
      currentName = name;
      animations[name].reset();
    },
    update(stepSeconds) {
      animations[currentName].update(stepSeconds);
    },
    frame() {
      return animations[currentName].frame();
    },
    current() {
      return currentName;
    },
    isFinished() {
      return animations[currentName].finished;
    },
  };
}
