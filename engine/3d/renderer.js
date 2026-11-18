// engine/3d/renderer.js
// WHAT: A small 3D renderer: set the camera and the light once per frame, then
//       drawMesh(mesh, modelMatrix, material) for each object.
// WHY:  Every 3D sample does the same uniform bookkeeping. This keeps sample code
//       about the game, while the Phong shader stays readable in lighting.js.
// DOC:  docs/modules/3d.md

import { createShaderProgram } from "./shader.js";
import { phongVertexShader, phongFragmentShader, defaultLight, defaultMaterial } from "./lighting.js";
import * as mat4 from "../math/mat4.js";

// screen: the object from createGL().
export function createRenderer(screen) {
  const gl = screen.gl;
  const shader = createShaderProgram(gl, phongVertexShader, phongFragmentShader);
  const state = {
    terms: [1, 1, 1],
    fogColor: screen.clearColor,
    fogDistance: 0,
  };

  // Call once per frame, before drawing meshes: clears the screen, sets camera and light.
  function begin(camera, light = defaultLight) {
    screen.clear();
    shader.use();
    const cameraPosition = typeof camera.position === "function" ? camera.position() : camera.position;
    shader.set("u_view", camera.view());
    shader.set("u_projection", camera.projection(screen.aspect()));
    shader.set("u_cameraPosition", [cameraPosition.x, cameraPosition.y, cameraPosition.z]);
    setLight(light);
    shader.set("u_terms", state.terms);
    shader.set("u_fogColor", state.fogColor);
    shader.set("u_fogDistance", state.fogDistance);
  }

  // Change the light in the middle of a frame (begin() already calls this).
  function setLight(light) {
    shader.use();
    shader.set("u_lightPosition", light.position || defaultLight.position);
    shader.set("u_lightColor", light.color || defaultLight.color);
    shader.set("u_ambient", light.ambient === undefined ? defaultLight.ambient : light.ambient);
  }

  // Draw one mesh. model: a mat4 (where/how big/which way). material: color, texture...
  function drawMesh(mesh, model, material = {}) {
    shader.set("u_model", model);
    shader.set("u_normalMatrix", mat4.normalMatrix(model));
    shader.set("u_color", material.color || defaultMaterial.color);
    shader.set("u_specularStrength", material.specularStrength ?? defaultMaterial.specularStrength);
    shader.set("u_shininess", material.shininess ?? defaultMaterial.shininess);
    if (material.texture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, material.texture);
      shader.set("u_texture", 0);
      shader.set("u_useTexture", 1);
    } else {
      shader.set("u_useTexture", 0);
    }
    mesh.draw();
  }

  // Fog fades far things into the background color: cheap depth, hides the far plane.
  function setFog(distance, color = screen.clearColor) {
    state.fogDistance = distance;
    state.fogColor = color;
    shader.use();
    shader.set("u_fogDistance", distance);
    shader.set("u_fogColor", color);
  }

  // For the lighting visualization: scale ambient, diffuse and specular separately.
  function setTerms(ambient, diffuse, specular) {
    state.terms = [ambient, diffuse, specular];
    shader.use();
    shader.set("u_terms", state.terms);
  }

  return { begin, setLight, drawMesh, setFog, setTerms, shader, gl };
}
