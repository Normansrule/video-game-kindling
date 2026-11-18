// engine/core/tween.js
// WHAT: Tweens: change a number on an object smoothly over time ("tween" = in-between).
// WHY:  Menus sliding in, a coin popping up, the screen fading to black: one line each.
//       tweens.to(title, { y: 40 }, 0.6, easeOutBack)
// DOC:  docs/modules/core.md   VIZ: viz/02-easing/

import { linear } from "../math/easing.js";

export function createTweens() {
  const active = [];

  // Animate target's numeric properties to the values in `goals` over `seconds`.
  // Returns the tween; set tween.onDone = function () {...} to chain things.
  function to(target, goals, seconds, ease = linear) {
    const starts = {};
    for (const key in goals) starts[key] = target[key];
    const tween = { target, starts, goals, seconds, ease, elapsed: 0, onDone: null, finished: false };
    active.push(tween);
    return tween;
  }

  // Call once per update step.
  function update(stepSeconds) {
    for (let i = active.length - 1; i >= 0; i--) {
      const tween = active[i];
      tween.elapsed = tween.elapsed + stepSeconds;
      const progress = Math.min(tween.elapsed / tween.seconds, 1);
      const shaped = tween.ease(progress);
      for (const key in tween.goals) {
        const start = tween.starts[key];
        tween.target[key] = start + (tween.goals[key] - start) * shaped;
      }
      if (progress >= 1) {
        tween.finished = true;
        active.splice(i, 1);
        if (tween.onDone) tween.onDone();
      }
    }
  }

  // Stop every tween on one object (or all tweens if no target is given).
  function cancel(target) {
    for (let i = active.length - 1; i >= 0; i--) {
      if (target === undefined || active[i].target === target) active.splice(i, 1);
    }
  }

  function count() {
    return active.length;
  }

  return { to, update, cancel, count };
}

// A countdown timer list: after(2, spawnBoss), every(0.5, fireBullet).
export function createTimers() {
  const timers = [];

  function after(seconds, callback) {
    const timer = { remaining: seconds, interval: 0, callback, cancelled: false };
    timers.push(timer);
    return timer;
  }

  function every(seconds, callback) {
    const timer = { remaining: seconds, interval: seconds, callback, cancelled: false };
    timers.push(timer);
    return timer;
  }

  function update(stepSeconds) {
    for (let i = timers.length - 1; i >= 0; i--) {
      const timer = timers[i];
      if (timer.cancelled) {
        timers.splice(i, 1);
        continue;
      }
      timer.remaining = timer.remaining - stepSeconds;
      if (timer.remaining <= 0) {
        timer.callback();
        if (timer.interval > 0) timer.remaining = timer.remaining + timer.interval;
        else timers.splice(i, 1);
      }
    }
  }

  function clear() {
    timers.length = 0;
  }

  return { after, every, update, clear };
}
