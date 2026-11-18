// samples/3d/02-lit-scene/main.js
// WHAT: A small lit world: a floor, rocks, a pond, and trees loaded from an .obj file.
//       Drag to orbit, scroll to zoom. The sun moves across the sky.
// WHY:  Shows how a real scene is put together: load a model once, draw it many times
//       with different model matrices ("instances"), and light everything with one light.
// TEACHES: OBJ loading, instancing with model matrices, orbit camera, fog, moving light.
// README: samples/3d/02-lit-scene/README.md

import { createGame } from "kindling/game.js";
import { createRenderer } from "kindling/3d/renderer.js";
import { createMesh } from "kindling/3d/mesh.js";
import { box, plane, sphere } from "kindling/3d/primitives.js";
import { parseOBJ } from "kindling/3d/obj.js";
import { createOrbitCamera } from "kindling/3d/camera3d.js";
import { createCheckerTexture } from "kindling/3d/texture.js";
import { loadText } from "kindling/core/assets.js";
import { createRandom } from "kindling/math/random.js";
import { clamp } from "kindling/math/scalar.js";
import * as mat4 from "kindling/math/mat4.js";

const game = createGame({ webgl: true, width: 640, height: 360, clearColor: [0.55, 0.72, 0.88] });
const gl = game.gl;
const renderer = createRenderer(game.screen);
renderer.setFog(28);   // far things fade into the sky color

// Meshes: built once, drawn many times.
const treeMesh = createMesh(gl, parseOBJ(await loadText("./tree.obj")));
const groundMesh = createMesh(gl, plane(40, 40, 1, 20));
const rockMesh = createMesh(gl, sphere(0.5, 10, 6));      // few segments = low-poly look
const crateMesh = createMesh(gl, box(1, 1, 1));
const groundTexture = createCheckerTexture(gl, 2, "#7fb35a", "#74a852");

// Place trees and rocks with a seeded random, so the scene is the same every time.
const random = createRandom(2024);
const trees = [];
for (let i = 0; i < 40; i++) {
  const angle = random.range(0, Math.PI * 2);
  const distance = random.range(4, 16);
  trees.push({ x: Math.cos(angle) * distance, z: Math.sin(angle) * distance, scale: random.range(0.8, 1.6), turn: random.range(0, 6) });
}
const rocks = [];
for (let i = 0; i < 14; i++) {
  rocks.push({ x: random.range(-10, 10), z: random.range(-10, 10), scale: random.range(0.3, 0.9) });
}

const camera = createOrbitCamera({ distance: 11, pitch: 0.45, target: { x: 0, y: 0.8, z: 0 }, far: 80 });
let sunAngle = 0.6;
let autoOrbit = true;
let lastTouch = null;    // where the finger was last step, to measure a drag
const hud = document.getElementById("hud");

game.scenes.add("view", {
  update(game, stepSeconds) {
    const mouse = game.input.mouse;
    if (mouse.isDown(0)) {
      const moved = mouse.movement();
      camera.rotate(moved.x, moved.y);
      autoOrbit = false;
    }
    // Touch: drag with one finger.
    const touches = game.input.touch.touches();
    if (touches.length === 1) {
      const touch = touches[0];
      if (lastTouch) camera.rotate((touch.x - lastTouch.x) * 2, (touch.y - lastTouch.y) * 2);
      lastTouch = { x: touch.x, y: touch.y };
      autoOrbit = false;
    } else {
      lastTouch = null;
    }
    camera.distance = clamp(camera.distance + mouse.wheel() * 0.8, 4, 25);
    if (autoOrbit) camera.yaw += stepSeconds * 0.15;
    sunAngle += stepSeconds * 0.2;
  },
  render() {
    // The sun circles overhead; its color warms near the horizon.
    const height = Math.sin(sunAngle) * 0.5 + 0.7;
    const sun = {
      position: [Math.cos(sunAngle) * 12, height * 14, 6],
      color: [1, 0.75 + height * 0.25, 0.55 + height * 0.45],
      ambient: 0.35,
    };
    renderer.begin(camera, sun);
    renderer.drawMesh(groundMesh, mat4.identity(), { texture: groundTexture, color: [1, 1, 1], specularStrength: 0 });
    for (const tree of trees) {
      let model = mat4.translation(tree.x, 0, tree.z);
      model = mat4.rotateY(model, tree.turn);
      model = mat4.scale(model, { x: tree.scale, y: tree.scale, z: tree.scale });
      renderer.drawMesh(treeMesh, model, { color: [0.25, 0.55, 0.3], specularStrength: 0.1 });
    }
    for (const rock of rocks) {
      let model = mat4.translation(rock.x, rock.scale * 0.3, rock.z);
      model = mat4.scale(model, { x: rock.scale, y: rock.scale * 0.7, z: rock.scale });
      renderer.drawMesh(rockMesh, model, { color: [0.55, 0.55, 0.58], specularStrength: 0.08, shininess: 8 });
    }
    // A stack of crates in the middle, and a "pond" (a flattened shiny sphere).
    renderer.drawMesh(crateMesh, mat4.translation(0, 0.5, 0), { color: [0.75, 0.45, 0.2] });
    renderer.drawMesh(crateMesh, mat4.rotateY(mat4.translation(0.2, 1.5, 0.1), 0.4), { color: [0.8, 0.5, 0.25] });
    renderer.drawMesh(rockMesh, mat4.scale(mat4.translation(3, 0.01, 2), { x: 5, y: 0.02, z: 3.5 }), { color: [0.2, 0.45, 0.75], specularStrength: 1, shininess: 64 });
    hud.textContent = "Trees drawn: " + trees.length + " copies of one mesh · fps " + game.time.fps;
  },
});
game.start("view");
