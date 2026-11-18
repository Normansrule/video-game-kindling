// engine/3d/lighting.js
// WHAT: The Phong lighting shaders (GLSL source code as strings) and default light settings.
// WHY:  Phong lighting = ambient + diffuse + specular:
//         ambient   a little light everywhere, so shadows aren't pitch black
//         diffuse   brighter where the surface faces the light (dot(normal, toLight))
//         specular  a shiny highlight where the light bounces toward your eye
//       It's the classic "good enough" lighting model; most jam games need nothing more.
// DOC:  docs/modules/3d.md   VIZ: viz/10-phong-lighting/

// Vertex shader: runs once per corner. Moves it into the world and onto the screen,
// and passes world position, normal and uv along to the fragment shader.
export const phongVertexShader = `#version 300 es
layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat4 u_normalMatrix;

out vec3 v_worldPosition;
out vec3 v_normal;
out vec2 v_uv;

void main() {
  vec4 world = u_model * vec4(a_position, 1.0);
  v_worldPosition = world.xyz;
  v_normal = mat3(u_normalMatrix) * a_normal;
  v_uv = a_uv;
  gl_Position = u_projection * u_view * world;
}
`;

// Fragment shader: runs once per pixel. Adds up the three kinds of light.
export const phongFragmentShader = `#version 300 es
precision highp float;

in vec3 v_worldPosition;
in vec3 v_normal;
in vec2 v_uv;

uniform vec3 u_color;            // the surface color
uniform sampler2D u_texture;
uniform bool u_useTexture;
uniform vec3 u_lightPosition;
uniform vec3 u_lightColor;
uniform vec3 u_cameraPosition;
uniform float u_ambient;         // 0..1
uniform float u_specularStrength;// 0..1
uniform float u_shininess;       // 2 = broad soft highlight, 128 = tiny sharp one
uniform vec3 u_terms;            // multiply (ambient, diffuse, specular); for the visualization
uniform vec3 u_fogColor;
uniform float u_fogDistance;     // 0 = no fog

out vec4 outColor;

void main() {
  vec3 base = u_color;
  if (u_useTexture) base *= texture(u_texture, v_uv).rgb;

  vec3 normal = normalize(v_normal);            // interpolation shortens normals; fix that
  vec3 toLight = normalize(u_lightPosition - v_worldPosition);
  vec3 toCamera = normalize(u_cameraPosition - v_worldPosition);

  float diffuse = max(dot(normal, toLight), 0.0);
  vec3 bounced = reflect(-toLight, normal);
  float specular = 0.0;
  if (diffuse > 0.0) specular = pow(max(dot(bounced, toCamera), 0.0), u_shininess);

  vec3 color = base * u_lightColor * (u_ambient * u_terms.x + diffuse * u_terms.y)
             + u_lightColor * specular * u_specularStrength * u_terms.z;

  if (u_fogDistance > 0.0) {
    float distanceToCamera = length(u_cameraPosition - v_worldPosition);
    float fog = clamp(distanceToCamera / u_fogDistance, 0.0, 1.0);
    color = mix(color, u_fogColor, fog * fog);
  }
  outColor = vec4(color, 1.0);
}
`;

// Sensible starting values. Copy and change: { ...defaultLight, color: [1, 0.9, 0.8] }.
export const defaultLight = {
  position: [4, 6, 3],
  color: [1, 1, 1],
  ambient: 0.25,
};

export const defaultMaterial = {
  color: [0.8, 0.8, 0.8],
  specularStrength: 0.4,
  shininess: 32,
  texture: null,
};
