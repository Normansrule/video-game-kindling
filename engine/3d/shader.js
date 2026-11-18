// engine/3d/shader.js
// WHAT: Compile a vertex shader + fragment shader into a program, and set its
//       uniforms by name with one function: program.set("u_color", [1, 0, 0]).
// WHY:  Shaders are small programs that run on the graphics card. The vertex shader
//       places each corner; the fragment shader colors each pixel. WebGL needs ~30
//       lines of setup and type-specific calls (uniform3fv, uniformMatrix4fv...);
//       this file hides that and gives readable error messages with line numbers.
// DOC:  docs/modules/3d.md

// Attribute locations are FIXED across Kindling so any mesh works with any shader:
//   layout(location = 0) in vec3 a_position;
//   layout(location = 1) in vec3 a_normal;
//   layout(location = 2) in vec2 a_uv;
//   layout(location = 3) in vec4 a_extra;   (per-corner extras: vertex colors, block layer, AO...)
export const ATTRIBUTE = { position: 0, normal: 1, uv: 2, extra: 3 };

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    // Print the source with line numbers so "ERROR: 0:12" is easy to find.
    const numbered = source.split("\n").map((line, index) => String(index + 1).padStart(3) + "  " + line).join("\n");
    gl.deleteShader(shader);
    const kind = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
    throw new Error("Could not compile " + kind + " shader:\n" + log + "\n" + numbered);
  }
  return shader;
}

export function createShaderProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error("Could not link shader program:\n" + gl.getProgramInfoLog(program));
  }

  // Look up every uniform once: its location and its type.
  const uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    const name = info.name.replace("[0]", "");
    uniforms[name] = { location: gl.getUniformLocation(program, info.name), type: info.type };
  }

  function use() {
    gl.useProgram(program);
  }

  // Set a uniform by name. Numbers, arrays and Float32Arrays are all fine.
  // Unknown names are ignored: the GLSL compiler removes uniforms you don't use.
  function set(name, value) {
    const uniform = uniforms[name];
    if (!uniform) return;
    const location = uniform.location;
    switch (uniform.type) {
      case gl.FLOAT: gl.uniform1f(location, value); break;
      case gl.FLOAT_VEC2: gl.uniform2fv(location, value); break;
      case gl.FLOAT_VEC3: gl.uniform3fv(location, value); break;
      case gl.FLOAT_VEC4: gl.uniform4fv(location, value); break;
      case gl.FLOAT_MAT3: gl.uniformMatrix3fv(location, false, value); break;
      case gl.FLOAT_MAT4: gl.uniformMatrix4fv(location, false, value); break;
      case gl.INT:
      case gl.BOOL:
      case gl.SAMPLER_2D:
      case gl.SAMPLER_2D_ARRAY:
      case gl.SAMPLER_2D_SHADOW: gl.uniform1i(location, value); break;
      case gl.INT_VEC2: gl.uniform2iv(location, value); break;
      default: throw new Error("shader.set: no rule for the type of '" + name + "'");
    }
  }

  return { program, use, set, uniforms };
}
