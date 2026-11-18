// Game Code Example 35: Write your own shader
// WHAT: A full-screen fragment shader: every pixel runs the little program in
//       FRAGMENT below, 60 times a second. Edit it and press Run.
// WHY:  Shaders are where graphics programmers live. This is the smallest WebGL 2
//       setup that runs one: one triangle covering the screen, a time uniform and the
//       resolution. Everything the stylized renderer does (fog, tone mapping, shadows)
//       is this idea, just with more inputs.
// TRY:  Change the palette, the 6.0 in the waves, or return vec4(uv, 0.5, 1.0) to see uv.

import { createGL } from "kindling/3d/gl.js";
import { createShaderProgram } from "kindling/3d/shader.js";

const FRAGMENT = `#version 300 es
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
out vec4 outColor;

// A cosine palette (a famous trick): four colors make a whole gradient.
vec3 palette(float t) {
  return vec3(0.5) + vec3(0.5) * cos(6.28318 * (vec3(1.0) * t + vec3(0.0, 0.33, 0.67)));
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / u_resolution.y;   // -1..1, square pixels
  float rings = length(uv) * 6.0 - u_time * 1.5;
  float waves = sin(uv.x * 6.0 + u_time) * cos(uv.y * 6.0 - u_time * 0.7);
  vec3 color = palette(rings * 0.1 + waves * 0.15 + u_time * 0.05);
  color *= 1.0 - 0.6 * length(uv) * 0.5;                              // a soft vignette
  outColor = vec4(color, 1.0);
}`;

const VERTEX = `#version 300 es
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const screen = createGL({ width: 640, height: 360 });
const gl = screen.gl;
const shader = createShaderProgram(gl, VERTEX, FRAGMENT);
const emptyLayout = gl.createVertexArray();

function frame(milliseconds) {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  shader.use();
  shader.set("u_time", milliseconds / 1000);
  shader.set("u_resolution", [gl.canvas.width, gl.canvas.height]);
  gl.bindVertexArray(emptyLayout);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
