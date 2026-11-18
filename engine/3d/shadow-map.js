// engine/3d/shadow-map.js
// WHAT: Sun shadows. Renders the scene once from the sun's point of view, keeping
//       only depth (how far each pixel is from the sun). Later, each pixel on screen
//       asks: "is something between me and the sun?" If yes, it is in shadow.
// WHY:  Shadows tell your eyes where things touch the ground and how tall they are.
//       Without them, a character looks like it is floating. This is the standard
//       technique ("shadow mapping") used by almost every 3D game.
// DOC:  docs/modules/3d-stylized.md (section "Shadows")   VIZ: viz/15-voxel-lighting/

import { createShaderProgram } from "./shader.js";
import { depthVertexShader, depthFragmentShader } from "./stylized-shader.js";
import * as mat4 from "../math/mat4.js";

// size: shadow texture width and height in pixels. Bigger = sharper, slower.
export function createShadowMap(gl, size = 2048) {
  // A depth texture with "comparison" turned on: sampling it returns 0..1 lit
  // instead of a raw depth (see sampler2DShadow in the stylized shader).
  const depthTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, size, size);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);

  // A framebuffer is an off-screen place to draw. This one has only a depth attachment.
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const shader = createShaderProgram(gl, depthVertexShader, depthFragmentShader);
  let lightMatrix = mat4.identity();

  // The sun is so far away its rays are parallel, so its "camera" is orthographic:
  // a box that covers everything that can cast a shadow onto what you see.
  // center: middle of the area to cover; radius: half its size; sunDirection: toward the sun.
  function aim(center, radius, sunDirection) {
    const eye = {
      x: center.x + sunDirection[0] * radius * 2,
      y: center.y + sunDirection[1] * radius * 2,
      z: center.z + sunDirection[2] * radius * 2,
    };
    // Pick an "up" that isn't parallel to the sun direction (lookAt needs that).
    const up = Math.abs(sunDirection[1]) > 0.95 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
    const view = mat4.lookAt(eye, center, up);
    // Snap to whole shadow pixels so shadows don't shimmer while the camera moves.
    const texelSize = (radius * 2) / size;
    view[12] = Math.round(view[12] / texelSize) * texelSize;
    view[13] = Math.round(view[13] / texelSize) * texelSize;
    const projection = mat4.orthographic(-radius, radius, -radius, radius, 0.1, radius * 4);
    lightMatrix = mat4.multiply(projection, view);
    return lightMatrix;
  }

  // Draw shadow casters: call begin(), then drawCaster(mesh, model) for each, then end().
  function begin() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, size, size);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    // Draw back faces into the shadow map: removes most "shadow acne" on lit faces.
    gl.cullFace(gl.FRONT);
    shader.use();
    shader.set("u_lightMatrix", lightMatrix);
  }

  function drawCaster(mesh, model) {
    shader.set("u_model", model);
    mesh.draw();
  }

  function end(screenWidth, screenHeight) {
    gl.cullFace(gl.BACK);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, screenWidth, screenHeight);
  }

  return {
    texture: depthTexture,
    size,
    aim,
    begin,
    drawCaster,
    end,
    matrix: () => lightMatrix,
  };
}
