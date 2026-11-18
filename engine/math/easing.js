// engine/math/easing.js
// WHAT: Easing functions. Each takes t from 0 to 1 and returns a "shaped" t.
// WHY:  Things that start and stop gently feel alive; linear movement feels robotic.
//       Use with lerp: x = lerp(start, end, easeOutCubic(t)).
// DOC:  docs/modules/math.md   VIZ: viz/02-easing/
//
// Naming: "In" = starts slow, "Out" = ends slow, "InOut" = both.

export function linear(t) {
  return t;
}

export function easeInQuad(t) {
  return t * t;
}
export function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}
export function easeInOutQuad(t) {
  if (t < 0.5) return 2 * t * t;
  return 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeInCubic(t) {
  return t * t * t;
}
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
export function easeInOutCubic(t) {
  if (t < 0.5) return 4 * t * t * t;
  return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeInSine(t) {
  return 1 - Math.cos((t * Math.PI) / 2);
}
export function easeOutSine(t) {
  return Math.sin((t * Math.PI) / 2);
}
export function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function easeInExpo(t) {
  if (t === 0) return 0;
  return Math.pow(2, 10 * t - 10);
}
export function easeOutExpo(t) {
  if (t === 1) return 1;
  return 1 - Math.pow(2, -10 * t);
}

// "Back" pulls back a little before going (In) or overshoots then settles (Out).
const backStrength = 1.70158;
export function easeInBack(t) {
  return (backStrength + 1) * t * t * t - backStrength * t * t;
}
export function easeOutBack(t) {
  const u = t - 1;
  return 1 + (backStrength + 1) * u * u * u + backStrength * u * u;
}

// "Elastic" wobbles like a spring at the end.
export function easeOutElastic(t) {
  if (t === 0 || t === 1) return t;
  const period = (2 * Math.PI) / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * period) + 1;
}

// "Bounce" hits the end and bounces like a dropped ball.
export function easeOutBounce(t) {
  const strength = 7.5625;
  const width = 2.75;
  if (t < 1 / width) return strength * t * t;
  if (t < 2 / width) {
    const u = t - 1.5 / width;
    return strength * u * u + 0.75;
  }
  if (t < 2.5 / width) {
    const u = t - 2.25 / width;
    return strength * u * u + 0.9375;
  }
  const u = t - 2.625 / width;
  return strength * u * u + 0.984375;
}
export function easeInBounce(t) {
  return 1 - easeOutBounce(1 - t);
}

// All of them by name, for menus and the easing visualization.
export const easings = {
  linear,
  easeInQuad, easeOutQuad, easeInOutQuad,
  easeInCubic, easeOutCubic, easeInOutCubic,
  easeInSine, easeOutSine, easeInOutSine,
  easeInExpo, easeOutExpo,
  easeInBack, easeOutBack,
  easeOutElastic,
  easeInBounce, easeOutBounce,
};
