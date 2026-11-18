// engine/math/scalar.js
// WHAT: Small helpers for single numbers: clamp, lerp, remap, approach, wrap, angles.
// WHY:  Every game needs these a hundred times. Having one tested copy beats
//       re-typing Math.min(Math.max(...)) and getting the order wrong.
// DOC:  docs/modules/math.md

// Keep a value between a minimum and a maximum.
export function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// Linear interpolation: t = 0 gives start, t = 1 gives end, t = 0.5 is halfway.
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

// The opposite of lerp: where does value sit between start and end? (0..1)
export function inverseLerp(start, end, value) {
  if (start === end) return 0;
  return (value - start) / (end - start);
}

// Map a value from one range to another. remap(5, 0, 10, 100, 200) is 150.
export function remap(value, fromStart, fromEnd, toStart, toEnd) {
  const t = inverseLerp(fromStart, fromEnd, value);
  return lerp(toStart, toEnd, t);
}

// Move current toward target by at most maxStep, without overshooting.
// Great for acceleration and friction: speed = approach(speed, 0, friction * dt).
export function approach(current, target, maxStep) {
  if (current < target) return Math.min(current + maxStep, target);
  if (current > target) return Math.max(current - maxStep, target);
  return target;
}

// Wrap a value into [min, max). wrap(370, 0, 360) is 10. Handles negatives too.
export function wrap(value, min, max) {
  const range = max - min;
  let result = (value - min) % range;
  if (result < 0) result = result + range;
  return result + min;
}

export function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians) {
  return (radians * 180) / Math.PI;
}

// True when two numbers are equal apart from tiny floating-point noise.
export function nearlyEqual(a, b, tolerance = 1e-6) {
  return Math.abs(a - b) <= tolerance;
}

// Frame-rate independent smoothing: move a fraction of the way each second.
// sharpness 10 means "close about 63% of the gap every 0.1 seconds".
export function damp(current, target, sharpness, deltaSeconds) {
  return lerp(current, target, 1 - Math.exp(-sharpness * deltaSeconds));
}
