// engine/3d/sky.js
// WHAT: Draws the sky behind everything: a gradient from horizon to zenith, a soft
//       sun, drifting clouds and stars at night, all computed per pixel in a shader.
//       Also the time-of-day table: sun angle and light colors for any hour.
// WHY:  A plain clear color looks like a void. A gradient sky that matches the fog
//       color at the horizon makes the world melt into the distance. One triangle
//       covering the whole screen is enough: each pixel works out which direction
//       it looks in and colors itself.
// DOC:  docs/modules/3d-stylized.md (section "Sky and time of day")

import { createShaderProgram } from "./shader.js";
import * as mat4 from "../math/mat4.js";

const skyVertexShader = `#version 300 es
// No vertex data: three corners made from gl_VertexID cover the whole screen.
out vec2 v_screen;
void main() {
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  v_screen = corner * 2.0 - 1.0;
  gl_Position = vec4(v_screen, 0.9999, 1.0);
}
`;

const skyFragmentShader = `#version 300 es
precision highp float;
in vec2 v_screen;
uniform mat4 u_inverseViewProjection;
uniform vec3 u_sunDirection;
uniform vec3 u_sunColor;
uniform vec3 u_zenithColor;
uniform vec3 u_horizonColor;
uniform float u_time;
uniform float u_night;
uniform float u_exposure;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float valueNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
vec3 toneMap(vec3 c) {
  c *= u_exposure;
  return clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  // Undo the camera: screen point -> a direction in the world.
  vec4 farPoint = u_inverseViewProjection * vec4(v_screen, 1.0, 1.0);
  vec4 nearPoint = u_inverseViewProjection * vec4(v_screen, -1.0, 1.0);
  vec3 direction = normalize(farPoint.xyz / farPoint.w - nearPoint.xyz / nearPoint.w);

  float height = max(direction.y, 0.0);
  vec3 color = mix(u_horizonColor, u_zenithColor, pow(height, 0.5));
  // Below the horizon: fade to the horizon color (fog hides the ground there anyway).
  if (direction.y < 0.0) color = u_horizonColor;

  // Sun: a bright disk plus a wide glow.
  float toSun = max(dot(direction, u_sunDirection), 0.0);
  color += u_sunColor * (pow(toSun, 900.0) * 6.0 + pow(toSun, 12.0) * 0.35);

  // Clouds: noise projected onto a flat layer high above, drifting with time.
  if (direction.y > 0.02) {
    vec2 cloudPoint = direction.xz / direction.y * 1.5 + vec2(u_time * 0.02, 0.0);
    float clouds = valueNoise(cloudPoint) * 0.6 + valueNoise(cloudPoint * 2.3) * 0.3 + valueNoise(cloudPoint * 5.0) * 0.1;
    clouds = smoothstep(0.55, 0.8, clouds) * smoothstep(0.02, 0.25, direction.y);
    vec3 cloudColor = mix(vec3(1.0), u_sunColor, 0.25) * (1.0 - u_night * 0.85);
    color = mix(color, cloudColor, clouds * 0.75);
  }

  // Stars at night.
  if (u_night > 0.0 && direction.y > 0.0) {
    vec2 cell = floor(direction.xz / (direction.y + 0.3) * 160.0);
    float star = step(0.997, hash(cell)) * u_night * height;
    color += vec3(star);
  }
  outColor = vec4(pow(toneMap(color), vec3(1.0 / 2.2)), 1.0);
}
`;

function mixColor(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Light settings at a few key moments. Colors are LINEAR (see stylized-shader.js).
const NIGHT = { sun: [0.1, 0.13, 0.25], sky: [0.06, 0.08, 0.16], ground: [0.02, 0.025, 0.04], zenith: [0.004, 0.008, 0.025], horizon: [0.025, 0.04, 0.08], night: 1 };
const DAY = { sun: [2.6, 2.25, 1.75], sky: [0.2, 0.29, 0.48], ground: [0.1, 0.085, 0.06], zenith: [0.07, 0.2, 0.62], horizon: [0.42, 0.6, 0.85], night: 0 };
const KEYS = [
  { at: 0.0, ...NIGHT },
  { at: 0.18, ...NIGHT },
  { at: 0.25, sun: [1.3, 0.5, 0.22], sky: [0.22, 0.22, 0.38], ground: [0.1, 0.07, 0.06], zenith: [0.1, 0.15, 0.4], horizon: [0.95, 0.45, 0.28], night: 0.15 },
  { at: 0.33, ...DAY },
  { at: 0.67, ...DAY },
  { at: 0.75, sun: [1.4, 0.52, 0.22], sky: [0.26, 0.22, 0.38], ground: [0.1, 0.07, 0.06], zenith: [0.12, 0.13, 0.36], horizon: [1.0, 0.42, 0.24], night: 0.15 },
  { at: 0.82, ...NIGHT },
  { at: 1.0, ...NIGHT },
];

// timeOfDay: 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset.
// Returns sunDirection plus every color the renderer needs.
export function skyAtTime(timeOfDay) {
  const t = ((timeOfDay % 1) + 1) % 1;
  let index = 0;
  while (index < KEYS.length - 2 && t > KEYS[index + 1].at) index = index + 1;
  const from = KEYS[index];
  const to = KEYS[index + 1];
  const blend = (t - from.at) / (to.at - from.at);
  // The sun circles east -> overhead -> west. At night we light with the "moon" instead
  // (same direction trick, opposite side), so shadows still make sense.
  const angle = (t - 0.25) * Math.PI * 2;
  let sunDirection = [Math.cos(angle), Math.sin(angle), 0.35];
  if (sunDirection[1] < 0.15) sunDirection = [-Math.cos(angle) * 0.6, 0.6, 0.45];
  const length = Math.hypot(sunDirection[0], sunDirection[1], sunDirection[2]);
  const horizon = mixColor(from.horizon, to.horizon, blend);
  return {
    sunDirection: sunDirection.map((value) => value / length),
    sunColor: mixColor(from.sun, to.sun, blend),
    skyColor: mixColor(from.sky, to.sky, blend),
    groundColor: mixColor(from.ground, to.ground, blend),
    zenithColor: mixColor(from.zenith, to.zenith, blend),
    horizonColor: horizon,
    fogColor: horizon,
    night: from.night + (to.night - from.night) * blend,
  };
}

export function createSky(gl) {
  const shader = createShaderProgram(gl, skyVertexShader, skyFragmentShader);
  const emptyLayout = gl.createVertexArray();

  // Draw first each frame. Depth writes are off so the world always draws over it.
  function draw(view, projection, light, time, exposure = 1) {
    const inverse = mat4.invert(mat4.multiply(projection, view));
    shader.use();
    shader.set("u_inverseViewProjection", inverse);
    shader.set("u_sunDirection", light.sunDirection);
    shader.set("u_sunColor", light.sunColor);
    shader.set("u_zenithColor", light.zenithColor);
    shader.set("u_horizonColor", light.horizonColor);
    shader.set("u_time", time);
    shader.set("u_night", light.night);
    shader.set("u_exposure", exposure);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.bindVertexArray(emptyLayout);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
  }
  return { draw };
}
