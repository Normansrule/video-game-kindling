// engine/3d/camera3d.js
// WHAT: Two cameras for 3D: an orbit camera (circles around a point, for viewers)
//       and a first-person camera (walk and look, for shooters and walking sims).
//       Both give you the view and projection matrices the shaders need.
// WHY:  The camera never moves. Instead, the VIEW matrix moves the whole world the
//       opposite way, and the PROJECTION matrix squashes 3D into the 2D screen.
// DOC:  docs/modules/3d.md   VIZ: viz/09-transforms/

import * as mat4 from "../math/mat4.js";
import { clamp } from "../math/scalar.js";

const UP = { x: 0, y: 1, z: 0 };

function createProjection(options) {
  return {
    fieldOfView: options.fieldOfView || Math.PI / 3,   // 60 degrees, vertical
    near: options.near || 0.1,                          // closer than this is cut off
    far: options.far || 200,                            // farther than this is cut off
  };
}

// Looks at `target` from `distance` away. yaw turns around, pitch tilts up and down.
export function createOrbitCamera(options = {}) {
  const camera = {
    ...createProjection(options),
    target: options.target || { x: 0, y: 0, z: 0 },
    distance: options.distance || 5,
    yaw: options.yaw || 0,
    pitch: options.pitch === undefined ? 0.4 : options.pitch,
  };

  // Where the camera sits: on a sphere around the target.
  camera.position = function position() {
    return {
      x: camera.target.x + camera.distance * Math.cos(camera.pitch) * Math.sin(camera.yaw),
      y: camera.target.y + camera.distance * Math.sin(camera.pitch),
      z: camera.target.z + camera.distance * Math.cos(camera.pitch) * Math.cos(camera.yaw),
    };
  };
  camera.view = () => mat4.lookAt(camera.position(), camera.target, UP);
  camera.projection = (aspect) => mat4.perspective(camera.fieldOfView, aspect, camera.near, camera.far);

  // Drag to orbit: give it how far the mouse moved in pixels.
  camera.rotate = function rotate(deltaX, deltaY) {
    camera.yaw -= deltaX * 0.01;
    camera.pitch = clamp(camera.pitch + deltaY * 0.01, -1.5, 1.5);
  };
  return camera;
}

// Stands at `position`, looks where yaw/pitch point. yaw 0 looks down -z.
export function createFirstPersonCamera(options = {}) {
  const camera = {
    ...createProjection(options),
    position: options.position || { x: 0, y: 1.6, z: 0 },   // 1.6 m = eye height
    yaw: options.yaw || 0,
    pitch: options.pitch || 0,
  };

  // The direction we are looking (length 1).
  camera.forward = function forward() {
    return {
      x: -Math.sin(camera.yaw) * Math.cos(camera.pitch),
      y: Math.sin(camera.pitch),
      z: -Math.cos(camera.yaw) * Math.cos(camera.pitch),
    };
  };
  // Forward along the ground only (walking shouldn't fly you up when you look up).
  camera.flatForward = () => ({ x: -Math.sin(camera.yaw), y: 0, z: -Math.cos(camera.yaw) });
  camera.right = () => ({ x: Math.cos(camera.yaw), y: 0, z: -Math.sin(camera.yaw) });

  camera.view = function view() {
    const look = camera.forward();
    const target = { x: camera.position.x + look.x, y: camera.position.y + look.y, z: camera.position.z + look.z };
    return mat4.lookAt(camera.position, target, UP);
  };
  camera.projection = (aspect) => mat4.perspective(camera.fieldOfView, aspect, camera.near, camera.far);

  // Mouse look: pixels moved -> radians turned. Pitch stops just short of straight up/down.
  camera.look = function look(deltaX, deltaY, sensitivity = 0.0025) {
    camera.yaw -= deltaX * sensitivity;
    camera.pitch = clamp(camera.pitch - deltaY * sensitivity, -1.5, 1.5);
  };
  return camera;
}
