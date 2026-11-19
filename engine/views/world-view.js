// engine/views/world-view.js
// WHAT: One object that shows a block world in any of five modes, and can switch
//       between them while the game runs:
//         "2d"      top-down map              (Canvas 2D)
//         "iso"     2.5D isometric diorama    (Canvas 2D)
//         "raycast" 2.5D first-person         (Canvas 2D pixel buffer)
//         "3d"      3D third-person           (WebGL 2)
//         "3d-fps"  3D first-person           (WebGL 2)
// WHY:  Your game logic (the world, the player, the rules) should not care how it
//       is drawn. Keep the game in plain data, and pick the view at the end. This is
//       how one Kindling game can be 2D, 2.5D or 3D with a single line changed.
//       A <canvas> can only ever have ONE kind of context (2D or WebGL), so switching
//       modes swaps in a fresh canvas.
// DOC:  docs/modules/views.md   VIZ: viz/14-world-modes/   SAMPLE: samples/modes/one-world/
//
// Usage:
//   const view = createWorldView({ container: "#stage", world, mode: "iso" });
//   view.setMode("3d");
//   // every frame: view.render(player, timeSeconds);   player = { x, y, z, yaw, walkCycle }

import { createMapView } from "./map-view.js";
import { createIsoView } from "./iso-view.js";
import { createRaycastView } from "./raycast-view.js";
import { createGL } from "../3d/gl.js";
import { createWorldRenderer } from "../3d/world-renderer.js";
import { createCharacter } from "../3d/character.js";
import { coinModel, crystalModel } from "../3d/lowpoly.js";
import { createOrbitCamera, createFirstPersonCamera } from "../3d/camera3d.js";
import { raycastVoxels } from "../world/voxel-world.js";
import * as mat4 from "../math/mat4.js";

const FOLLOW_DISTANCE = 8;

export const VIEW_MODES = ["2d", "iso", "raycast", "3d", "3d-fps"];

export const VIEW_LABELS = {
  "2d": "2D map",
  iso: "2.5D isometric",
  raycast: "2.5D raycaster",
  "3d": "3D third person",
  "3d-fps": "3D first person",
};

// options: container (element or selector), world, mode, width/height (internal
// resolution for the 2D modes, default 640 x 360), seaLevel (for the 3D ocean),
// timeOfDay (3D, 0..1), character (3D: a character spec from the character designer).
export function createWorldView(options) {
  let container = options.container;
  if (typeof container === "string") container = document.querySelector(container);
  const world = options.world;
  const width = options.width || 640;
  const height = options.height || 360;
  let mode = null;
  let canvas = null;
  let active = null;          // the current view's { render }
  let three = null;           // 3D extras: renderer, cameras, models

  function freshCanvas() {
    if (canvas) {
      // Give a WebGL canvas's graphics memory back right away (browsers allow only ~16 contexts).
      if (three) three.screen.gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    }
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.tabIndex = 0;
    canvas.style.cssText = "display:block;width:100%;height:auto;aspect-ratio:" + width + "/" + height + ";image-rendering:pixelated;outline:none;touch-action:none";
    canvas.setAttribute("aria-label", options.label || "Game view");
    container.appendChild(canvas);
    return canvas;
  }

  function setup3D() {
    const screen = createGL({ canvas, width, height, fit: false });
    screen.destroy();   // we size this canvas ourselves (resize3D), so drop gl.js's resize listener
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    const renderer = createWorldRenderer(screen, { timeOfDay: options.timeOfDay ?? 0.38 });
    renderer.setWorld(world);
    if (options.seaLevel !== undefined) renderer.setOcean(options.seaLevel);
    three = {
      screen,
      renderer,
      character: createCharacter(renderer, options.character),
      models: { coin: renderer.createModel(coinModel()), crystal: renderer.createModel(crystalModel()) },
      orbit: createOrbitCamera({ distance: FOLLOW_DISTANCE, pitch: 0.42, far: 400 }),
      firstPerson: createFirstPersonCamera({ far: 400, fieldOfView: 1.2 }),
    };
    // Keep the drawing buffer as sharp as the canvas on screen.
    resize3D();
  }

  function resize3D() {
    if (!three) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const cssWidth = canvas.clientWidth || width;
    canvas.width = Math.round(cssWidth * ratio);
    canvas.height = Math.round((cssWidth * height / width) * ratio);
  }
  window.addEventListener("resize", resize3D);

  function setMode(newMode) {
    if (!VIEW_MODES.includes(newMode)) throw new Error("Unknown view mode '" + newMode + "'. Use one of: " + VIEW_MODES.join(", "));
    if (newMode === mode) return;
    const wasThreeD = mode === "3d" || mode === "3d-fps";
    const isThreeD = newMode === "3d" || newMode === "3d-fps";
    mode = newMode;
    if (wasThreeD && isThreeD) return;           // same canvas, only the camera changes
    freshCanvas();
    three = null;
    if (mode === "2d") active = createMapView(canvas, world, { tileSize: options.tileSize || 20 });
    else if (mode === "iso") active = createIsoView(canvas, world);
    else if (mode === "raycast") active = createRaycastView(canvas, world, { resolution: Math.min(width, 400) });
    else { setup3D(); active = null; }
  }

  function render3D(player, time) {
    const { renderer, character, models } = three;
    let camera;
    if (mode === "3d") {
      camera = three.orbit;
      camera.target = { x: player.x, y: player.y + 1.2, z: player.z };
      // Ease the camera around behind the player instead of snapping.
      camera.yaw = camera.yaw + (player.yaw - camera.yaw) * 0.08;
      // Don't let walls and roofs get between the camera and the player: cast a ray
      // from the player back toward the camera and stop just before the first block.
      const back = {
        x: Math.cos(camera.pitch) * Math.sin(camera.yaw),
        y: Math.sin(camera.pitch),
        z: Math.cos(camera.pitch) * Math.cos(camera.yaw),
      };
      const hit = raycastVoxels(world, camera.target, back, FOLLOW_DISTANCE);
      const wanted = hit ? Math.max(1.2, hit.distance - 0.3) : FOLLOW_DISTANCE;
      // Pull in fast (never see through a wall), ease back out slowly.
      camera.distance = wanted < camera.distance ? wanted : camera.distance + (wanted - camera.distance) * 0.05;
      character.queue(player, player.yaw, player.walkCycle || 0);
    } else {
      camera = three.firstPerson;
      camera.position = { x: player.x, y: player.y + 1.6, z: player.z };
      camera.yaw = player.yaw;
      camera.pitch = player.pitch || 0;
    }
    for (const prop of world.props) {
      if (prop.hidden) continue;
      const model = models[prop.kind] || models.coin;
      const spin = mat4.multiply(mat4.translation(prop.x, prop.y + 0.5 + Math.sin(time * 3 + prop.x) * 0.1, prop.z), mat4.rotationY(time * 2 + prop.z));
      renderer.queueModel(model, spin);
    }
    renderer.render(camera, time);
  }

  function render(player, time = 0) {
    if (three) render3D(player, time);
    else active.render(player, time);
  }

  setMode(options.mode || "iso");

  return {
    setMode,
    render,
    get mode() { return mode; },
    get canvas() { return canvas; },
    // The 3D renderer (null in the 2D modes), e.g. to change view.renderer.settings.timeOfDay.
    get renderer() { return three ? three.renderer : null; },
  };
}
