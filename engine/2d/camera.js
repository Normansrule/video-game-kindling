// engine/2d/camera.js
// WHAT: A 2D camera: which part of a big world is on screen. Follows a target
//       smoothly, has a dead zone, stays inside the level, zooms, and shakes.
// WHY:  Levels are bigger than the screen. Instead of moving the whole world,
//       we move the camera, and draw everything shifted by the camera position.
// DOC:  docs/modules/camera.md   VIZ: viz/07-tilemap-camera/

import { damp } from "../math/scalar.js";

// options.width, options.height   size of the screen in game pixels
// options.bounds                  { x, y, width, height } the camera may not leave (optional)
// options.smoothing               how quickly it catches up (bigger = snappier, 0 = instant)
// options.deadZone                { width, height } box in the middle where the target can
//                                 move without the camera moving (optional)
export function createCamera(options) {
  const camera = {
    x: 0,                 // world position of the top-left corner of the screen
    y: 0,
    width: options.width,
    height: options.height,
    zoom: 1,
    bounds: options.bounds || null,
    smoothing: options.smoothing === undefined ? 8 : options.smoothing,
    deadZone: options.deadZone || { width: 0, height: 0 },
  };

  let shakeStrength = 0;
  let shakeSecondsLeft = 0;
  let shakeDuration = 0;
  let shakeOffsetX = 0;
  let shakeOffsetY = 0;

  // How much of the world fits on screen at the current zoom.
  function viewWidth() {
    return camera.width / camera.zoom;
  }
  function viewHeight() {
    return camera.height / camera.zoom;
  }

  // Keep the view inside the bounds (if the level is smaller than the screen, center it).
  function clampToBounds() {
    if (!camera.bounds) return;
    const bounds = camera.bounds;
    if (bounds.width <= viewWidth()) camera.x = bounds.x + (bounds.width - viewWidth()) / 2;
    else camera.x = Math.max(bounds.x, Math.min(camera.x, bounds.x + bounds.width - viewWidth()));
    if (bounds.height <= viewHeight()) camera.y = bounds.y + (bounds.height - viewHeight()) / 2;
    else camera.y = Math.max(bounds.y, Math.min(camera.y, bounds.y + bounds.height - viewHeight()));
  }

  // Jump straight to a point (center of the screen), no smoothing.
  camera.centerOn = function centerOn(x, y) {
    camera.x = x - viewWidth() / 2;
    camera.y = y - viewHeight() / 2;
    clampToBounds();
  };

  // Ease toward keeping `target` ({ x, y } or a rect) inside the dead zone. Call each step.
  camera.follow = function follow(target, stepSeconds) {
    const targetX = target.x + (target.width || 0) / 2;
    const targetY = target.y + (target.height || 0) / 2;
    const centerX = camera.x + viewWidth() / 2;
    const centerY = camera.y + viewHeight() / 2;
    let goalX = centerX;
    let goalY = centerY;
    const halfDeadWidth = camera.deadZone.width / 2;
    const halfDeadHeight = camera.deadZone.height / 2;
    // Only move when the target leaves the dead zone box.
    if (targetX > centerX + halfDeadWidth) goalX = targetX - halfDeadWidth;
    if (targetX < centerX - halfDeadWidth) goalX = targetX + halfDeadWidth;
    if (targetY > centerY + halfDeadHeight) goalY = targetY - halfDeadHeight;
    if (targetY < centerY - halfDeadHeight) goalY = targetY + halfDeadHeight;

    if (camera.smoothing <= 0) {
      camera.x = goalX - viewWidth() / 2;
      camera.y = goalY - viewHeight() / 2;
    } else {
      camera.x = damp(camera.x, goalX - viewWidth() / 2, camera.smoothing, stepSeconds);
      camera.y = damp(camera.y, goalY - viewHeight() / 2, camera.smoothing, stepSeconds);
    }
    clampToBounds();
  };

  // Shake the screen: strength in pixels, fades out over `seconds`.
  camera.shake = function shake(strength, seconds = 0.3) {
    shakeStrength = Math.max(shakeStrength, strength);
    shakeSecondsLeft = seconds;
    shakeDuration = seconds;
  };

  camera.update = function update(stepSeconds) {
    if (shakeSecondsLeft > 0) {
      shakeSecondsLeft = Math.max(0, shakeSecondsLeft - stepSeconds);
      const fade = shakeSecondsLeft / shakeDuration;
      shakeOffsetX = (Math.random() * 2 - 1) * shakeStrength * fade;
      shakeOffsetY = (Math.random() * 2 - 1) * shakeStrength * fade;
      if (shakeSecondsLeft === 0) shakeStrength = 0;
    } else {
      shakeOffsetX = 0;
      shakeOffsetY = 0;
    }
  };

  // Everything drawn between begin() and end() is in WORLD coordinates.
  camera.begin = function begin(context) {
    context.save();
    context.scale(camera.zoom, camera.zoom);
    // Round so pixel art doesn't shimmer between pixels.
    context.translate(-Math.round(camera.x + shakeOffsetX), -Math.round(camera.y + shakeOffsetY));
  };

  camera.end = function end(context) {
    context.restore();
  };

  // The visible part of the world as a rectangle (for culling and tilemap.draw).
  camera.view = function view() {
    return { x: camera.x, y: camera.y, width: viewWidth(), height: viewHeight() };
  };

  camera.worldToScreen = function worldToScreen(x, y) {
    return { x: (x - camera.x) * camera.zoom, y: (y - camera.y) * camera.zoom };
  };

  camera.screenToWorld = function screenToWorld(x, y) {
    return { x: x / camera.zoom + camera.x, y: y / camera.zoom + camera.y };
  };

  // Is a rectangle at least partly on screen? Skip drawing it if not.
  camera.sees = function sees(rect) {
    const area = camera.view();
    return rect.x < area.x + area.width && rect.x + (rect.width || 0) > area.x &&
           rect.y < area.y + area.height && rect.y + (rect.height || 0) > area.y;
  };

  return camera;
}
