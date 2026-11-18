// engine/3d/stylized-shader.js
// WHAT: The GLSL shaders behind Kindling's "stylized" 3D look: textured blocks and
//       vertex-colored low-poly models lit by a sun with soft shadows, a sky/ground
//       ambient light, ambient occlusion, lantern point lights, distance fog, and
//       filmic tone mapping. Plus a tiny depth-only shader for the shadow map.
// WHY:  Blocky games look good not because of detail, but because of LIGHT:
//         - hemisphere ambient: surfaces facing up get sky color, facing down get ground color
//         - ambient occlusion: corners and crevices are darker
//         - a shadow from the sun anchors every object to the ground
//         - fog fades distance into the sky color, so the world feels big
//         - tone mapping keeps bright sun from clipping to flat white
//       Each one is a few lines below. viz/15-voxel-lighting lets you switch each on and off.
// DOC:  docs/modules/3d-stylized.md
//
// Colors: textures are stored in sRGB (how screens show color). Light adds up
// correctly only in LINEAR space, so we convert in (pow 2.2), light, then convert back.

export const stylizedVertexShader = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;
layout(location = 3) in vec4 a_extra;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat4 u_lightMatrix;     // world -> the sun's view (for shadows)

out vec3 v_world;
out vec3 v_normal;
out vec2 v_uv;
out vec4 v_extra;
out vec4 v_lightSpace;

void main() {
  vec4 world = u_model * vec4(a_position, 1.0);
  v_world = world.xyz;
  // Models are only moved, turned and scaled evenly, so mat3(u_model) is fine for normals.
  v_normal = normalize(mat3(u_model) * a_normal);
  v_uv = a_uv;
  v_extra = a_extra;
  v_lightSpace = u_lightMatrix * world;
  gl_Position = u_projection * u_view * world;
}
`;

export const stylizedFragmentShader = `#version 300 es
precision highp float;
precision highp sampler2DArray;
precision highp sampler2DShadow;

in vec3 v_world;
in vec3 v_normal;
in vec2 v_uv;
in vec4 v_extra;
in vec4 v_lightSpace;

uniform int u_kind;                 // 0 = blocks, 1 = colored model, 2 = water
uniform sampler2DArray u_blocks;    // one layer per block texture
uniform sampler2DShadow u_shadowMap;
uniform bool u_shadows;
uniform float u_aoStrength;         // 0 = off, 1 = full
uniform vec3 u_tint;                // multiplies a model's colors (flash red when hit...)

uniform vec3 u_cameraPosition;
uniform vec3 u_sunDirection;        // points TOWARD the sun
uniform vec3 u_sunColor;
uniform vec3 u_skyColor;            // ambient from above
uniform vec3 u_groundColor;         // ambient from below
uniform vec3 u_fogColor;
uniform float u_fogDensity;
uniform float u_time;
uniform float u_exposure;
uniform float u_nightGlow;          // 0 by day, 1 at night: lanterns light up

uniform int u_pointLightCount;
uniform vec3 u_pointLights[8];
uniform vec3 u_pointLightColor;

out vec4 outColor;

vec3 toLinear(vec3 color) { return pow(color, vec3(2.2)); }

// ACES filmic curve (Narkowicz fit): bright values roll off softly instead of clipping.
vec3 toneMap(vec3 color) {
  color *= u_exposure;
  return clamp((color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14), 0.0, 1.0);
}

// How much of this pixel the sun can see: 1 = lit, 0 = in shadow.
// 4 samples, each already averaged by the hardware ("percentage closer filtering").
float sunVisibility(vec3 normal) {
  if (!u_shadows) return 1.0;
  vec3 coords = v_lightSpace.xyz / v_lightSpace.w * 0.5 + 0.5;
  if (coords.x < 0.0 || coords.x > 1.0 || coords.y < 0.0 || coords.y > 1.0 || coords.z > 1.0) return 1.0;
  // Bias: push the comparison a little toward the light so surfaces don't shadow themselves.
  float bias = 0.0008 + 0.0015 * (1.0 - max(dot(normal, u_sunDirection), 0.0));
  vec2 texel = 1.0 / vec2(textureSize(u_shadowMap, 0));
  float lit = 0.0;
  lit += texture(u_shadowMap, vec3(coords.xy + vec2(-0.5, -0.5) * texel, coords.z - bias));
  lit += texture(u_shadowMap, vec3(coords.xy + vec2(0.5, -0.5) * texel, coords.z - bias));
  lit += texture(u_shadowMap, vec3(coords.xy + vec2(-0.5, 0.5) * texel, coords.z - bias));
  lit += texture(u_shadowMap, vec3(coords.xy + vec2(0.5, 0.5) * texel, coords.z - bias));
  return lit / 4.0;
}

void main() {
  vec3 normal = normalize(v_normal);
  vec3 albedo;
  float ao = 1.0;
  float sky = 1.0;
  float glow = 0.0;
  float alpha = 1.0;

  if (u_kind == 1) {
    albedo = toLinear(v_extra.rgb * u_tint);
    glow = v_extra.a;
  } else {
    vec2 uv = v_uv;
    if (u_kind == 2) uv += vec2(u_time * 0.03, u_time * 0.02);   // slide the water texture
    albedo = toLinear(texture(u_blocks, vec3(uv, v_extra.x)).rgb);
    ao = mix(1.0, 0.35 + 0.65 * v_extra.y, u_aoStrength);
    sky = v_extra.z;
    glow = v_extra.w;
  }

  // 1. Ambient: blend ground color (facing down) to sky color (facing up).
  vec3 ambient = mix(u_groundColor, u_skyColor, normal.y * 0.5 + 0.5) * ao * sky;
  // 2. Sun: brighter when facing it, zero in shadow. AO softens it a little too.
  float facing = max(dot(normal, u_sunDirection), 0.0);
  vec3 sun = u_sunColor * facing * sunVisibility(normal) * mix(0.7, 1.0, ao);
  // 3. Lanterns: warm light that fades with distance squared.
  vec3 lamps = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (i >= u_pointLightCount) break;
    vec3 toLamp = u_pointLights[i] - v_world;
    float distanceSquared = dot(toLamp, toLamp);
    float wrap = max(dot(normal, normalize(toLamp)) * 0.6 + 0.4, 0.0);
    lamps += u_pointLightColor * wrap / (1.0 + distanceSquared * 0.35);
  }
  lamps *= u_nightGlow;

  vec3 color = albedo * (ambient + sun + lamps) + albedo * glow * (0.4 + 2.5 * u_nightGlow);

  vec3 toCamera = u_cameraPosition - v_world;
  float distanceToCamera = length(toCamera);
  vec3 viewDirection = toCamera / distanceToCamera;

  // Water: see-through, more opaque at grazing angles (Fresnel), with a sun glint.
  if (u_kind == 2) {
    float fresnel = pow(1.0 - max(dot(viewDirection, normal), 0.0), 3.0);
    vec3 reflected = reflect(-u_sunDirection, normal);
    float glint = pow(max(dot(reflected, viewDirection), 0.0), 80.0);
    color = mix(color, u_skyColor * 1.3, fresnel * 0.6) + u_sunColor * glint * 2.0;
    alpha = mix(0.62, 0.92, fresnel);
  }

  // 4. Fog: exponential-squared, toward the fog color (plus a warm haze toward the sun).
  float fog = 1.0 - exp(-pow(distanceToCamera * u_fogDensity, 2.0));
  float towardSun = pow(max(dot(-viewDirection, u_sunDirection), 0.0), 6.0);
  vec3 fogColor = mix(u_fogColor, u_sunColor * 0.9, towardSun * 0.35);
  color = mix(color, fogColor, fog);

  // 5. Tone map, then back to sRGB for the screen.
  outColor = vec4(pow(toneMap(color), vec3(1.0 / 2.2)), alpha);
}
`;

// Shadow pass: only depth matters, so the fragment shader does nothing at all.
export const depthVertexShader = `#version 300 es
layout(location = 0) in vec3 a_position;
uniform mat4 u_lightMatrix;
uniform mat4 u_model;
void main() {
  gl_Position = u_lightMatrix * u_model * vec4(a_position, 1.0);
}
`;

export const depthFragmentShader = `#version 300 es
precision mediump float;
void main() {}
`;
