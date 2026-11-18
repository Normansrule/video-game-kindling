// engine/3d/world-renderer.js
// WHAT: The stylized 3D renderer. Give it a block world and a camera; it draws the
//       sky, the blocks (rebuilt chunk by chunk when you edit them), any low-poly
//       models you queue, and see-through water, all with sun shadows, ambient
//       occlusion, lantern lights, fog and a time-of-day cycle.
// WHY:  This is the "graphics engine" part of Kindling 2: one object that owns the
//       order of drawing (the "render pipeline"), so your game code only says WHAT
//       to draw:
//         1. shadow pass   draw depth from the sun into the shadow map
//         2. sky           one full-screen triangle
//         3. opaque world  block chunks, then models
//         4. water         last, blended, because you see things through it
// DOC:  docs/modules/3d-stylized.md   VIZ: viz/15-voxel-lighting/
//
// Usage:
//   const renderer = createWorldRenderer(game.screen);
//   renderer.setWorld(world);
//   // every frame:
//   renderer.queueModel(coinMesh, mat4.translation(5, 10, 5));
//   renderer.render(camera, game.time.elapsed);

import { createShaderProgram } from "./shader.js";
import { stylizedVertexShader, stylizedFragmentShader } from "./stylized-shader.js";
import { createShadowMap } from "./shadow-map.js";
import { createSky, skyAtTime } from "./sky.js";
import { createMesh } from "./mesh.js";
import { buildChunkMesh, computeSkyTops, CHUNK_SIZE } from "./voxel-mesh.js";
import { paintAllTextures, TEXTURE_SIZE } from "../world/textures.js";
import { blockType, textureLayer, BLOCK } from "../world/blocks.js";
import * as mat4 from "../math/mat4.js";

// Upload every block texture as one layer of a "texture array" (a stack of
// same-size images). Unlike one big atlas image, layers never bleed into each other.
function createBlockTextureArray(gl) {
  const textures = paintAllTextures(TEXTURE_SIZE);
  const layerBytes = TEXTURE_SIZE * TEXTURE_SIZE * 4;
  const pixels = new Uint8Array(layerBytes * textures.length);
  textures.forEach((texture, layer) => pixels.set(texture.data, layer * layerBytes));
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, TEXTURE_SIZE, TEXTURE_SIZE, textures.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  // NEAREST up close keeps the crisp pixel-art look; mipmaps far away stop shimmering.
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
  // (No anisotropic filtering here: on many graphics cards it turns NEAREST into blur.)
  return texture;
}

// options: shadowSize (2048), shadowRadius (36 world units), timeOfDay (0.4)
export function createWorldRenderer(screen, options = {}) {
  const gl = screen.gl;
  const shader = createShaderProgram(gl, stylizedVertexShader, stylizedFragmentShader);
  const shadowMap = createShadowMap(gl, options.shadowSize || 2048);
  const sky = createSky(gl);
  const blockTextures = createBlockTextureArray(gl);
  const identity = mat4.identity();

  // Settings you can change at any time (the lighting visualization has sliders for them).
  const settings = {
    timeOfDay: options.timeOfDay ?? 0.4,
    shadows: true,
    ambientOcclusion: 1,
    fogDensity: options.fogDensity ?? 0.011,
    exposure: options.exposure ?? 0.8,
    shadowRadius: options.shadowRadius || 36,
  };

  let world = null;
  let skyTops = null;
  let stopListening = null;
  const chunks = new Map();     // "cx,cz" -> { solid, water } meshes
  const dirty = new Set();      // chunk keys that need rebuilding
  let lanterns = [];            // positions of glowing blocks, for point lights
  let modelQueue = [];
  let ocean = null;             // a big flat sea around the world (see setOcean)

  function chunkKey(chunkX, chunkZ) {
    return chunkX + "," + chunkZ;
  }

  function findLanterns() {
    lanterns = [];
    for (let y = 0; y < world.height; y++) {
      for (let z = 0; z < world.depth; z++) {
        for (let x = 0; x < world.width; x++) {
          if (blockType(world.get(x, y, z)).glow) lanterns.push([x + 0.5, y + 0.5, z + 0.5]);
        }
      }
    }
  }

  // Switch to a new world: throw away old chunks, mark every new chunk dirty.
  function setWorld(newWorld) {
    if (stopListening) stopListening();
    for (const chunk of chunks.values()) { chunk.solid.destroy(); chunk.water.destroy(); }
    chunks.clear();
    world = newWorld;
    skyTops = computeSkyTops(world);
    findLanterns();
    for (let chunkZ = 0; chunkZ * CHUNK_SIZE < world.depth; chunkZ++) {
      for (let chunkX = 0; chunkX * CHUNK_SIZE < world.width; chunkX++) dirty.add(chunkKey(chunkX, chunkZ));
    }
    // When a block changes, rebuild its chunk, plus the neighbor if it sits on an edge
    // (the neighbor's faces and AO depend on this block too).
    stopListening = world.onChange((x, y, z, id) => {
      skyTops[z][x] = world.topY(x, z, false);
      for (const [dx, dz] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= world.width || nz >= world.depth) continue;
        if (dx !== 0 || dz !== 0) skyTops[nz][nx] = world.topY(nx, nz, false);
        dirty.add(chunkKey(Math.floor(nx / CHUNK_SIZE), Math.floor(nz / CHUNK_SIZE)));
      }
      if (blockType(id).glow || lanterns.some((p) => p[0] === x + 0.5 && p[1] === y + 0.5 && p[2] === z + 0.5)) findLanterns();
    });
  }

  // A sea that reaches the horizon: four big water quads AROUND the world (not under
  // it, or the water inside the world would be drawn twice). level = the sea level y.
  function setOcean(level, reach = 600) {
    if (ocean) ocean.destroy();
    const top = level - 0.12;
    const layer = textureLayer(BLOCK.WATER, "top");
    const data = { positions: [], normals: [], uvs: [], extras: [], indices: [] };
    const w = world.width;
    const d = world.depth;
    const rectangles = [[-reach, -reach, w + reach, 0], [-reach, d, w + reach, d + reach], [-reach, 0, 0, d], [w, 0, w + reach, d]];
    for (const [x0, z0, x1, z1] of rectangles) {
      const start = data.positions.length / 3;
      for (const [x, z] of [[x0, z1], [x1, z1], [x1, z0], [x0, z0]]) {
        data.positions.push(x, top, z);
        data.normals.push(0, 1, 0);
        data.uvs.push(x, z);               // texture repeats once per block
        data.extras.push(layer, 1, 1, 0);
      }
      data.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }
    ocean = createMesh(gl, data);
  }

  function rebuildDirtyChunks() {
    for (const key of dirty) {
      const [chunkX, chunkZ] = key.split(",").map(Number);
      const old = chunks.get(key);
      if (old) { old.solid.destroy(); old.water.destroy(); }
      const data = buildChunkMesh(world, chunkX, chunkZ, skyTops);
      chunks.set(key, { solid: createMesh(gl, data.solid), water: createMesh(gl, data.water) });
    }
    dirty.clear();
  }

  // Low-poly models: queue them every frame; render() draws them and empties the queue.
  // tint multiplies the model's colors ([1, 0.4, 0.4] flashes it red).
  function queueModel(mesh, model, tint = [1, 1, 1]) {
    modelQueue.push({ mesh, model, tint });
  }

  function cameraPosition(camera) {
    return typeof camera.position === "function" ? camera.position() : camera.position;
  }

  // Draw one frame. time: seconds since start (animates water, clouds).
  function render(camera, time = 0) {
    const light = skyAtTime(settings.timeOfDay);
    const eye = cameraPosition(camera);
    if (world) rebuildDirtyChunks();
    const width = gl.canvas.width;
    const height = gl.canvas.height;

    // 1. Shadow pass: center the sun's view a little ahead of the camera.
    if (settings.shadows) {
      const focus = camera.target || eye;
      shadowMap.aim(focus, settings.shadowRadius, light.sunDirection);
      shadowMap.begin();
      for (const chunk of chunks.values()) shadowMap.drawCaster(chunk.solid, identity);
      for (const item of modelQueue) shadowMap.drawCaster(item.mesh, item.model);
      shadowMap.end(width, height);
    }

    // 2. Sky. (Set the viewport every frame: the canvas may have been resized.)
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const view = camera.view();
    const projection = camera.projection(width / height);
    sky.draw(view, projection, light, time, settings.exposure);

    // 3. Shared settings for the world shader.
    shader.use();
    shader.set("u_view", view);
    shader.set("u_projection", projection);
    shader.set("u_lightMatrix", shadowMap.matrix());
    shader.set("u_cameraPosition", [eye.x, eye.y, eye.z]);
    shader.set("u_sunDirection", light.sunDirection);
    shader.set("u_sunColor", light.sunColor);
    shader.set("u_skyColor", light.skyColor);
    shader.set("u_groundColor", light.groundColor);
    shader.set("u_fogColor", light.fogColor);
    shader.set("u_fogDensity", settings.fogDensity);
    shader.set("u_time", time);
    shader.set("u_exposure", settings.exposure);
    shader.set("u_nightGlow", light.night);
    shader.set("u_shadows", settings.shadows ? 1 : 0);
    shader.set("u_aoStrength", settings.ambientOcclusion);
    shader.set("u_tint", [1, 1, 1]);
    setPointLights(eye);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, blockTextures);
    shader.set("u_blocks", 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, shadowMap.texture);
    shader.set("u_shadowMap", 1);

    // 3a. Blocks, 3b. models.
    shader.set("u_model", identity);
    shader.set("u_kind", 0);
    for (const chunk of chunks.values()) chunk.solid.draw();
    shader.set("u_kind", 1);
    for (const item of modelQueue) {
      shader.set("u_model", item.model);
      shader.set("u_tint", item.tint);
      item.mesh.draw();
    }
    modelQueue = [];

    // 4. Water: blend with what's behind, and don't write depth (so water behind
    //    water still shows). Both sides drawn, so it's visible from underneath too.
    shader.set("u_model", identity);
    shader.set("u_kind", 2);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    for (const chunk of chunks.values()) chunk.water.draw();
    if (ocean) ocean.draw();
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  // The 8 lanterns nearest the camera become point lights.
  function setPointLights(eye) {
    const nearest = lanterns
      .map((position) => ({ position, distance: Math.hypot(position[0] - eye.x, position[1] - eye.y, position[2] - eye.z) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8);
    const flat = new Float32Array(24);
    nearest.forEach((lamp, index) => flat.set(lamp.position, index * 3));
    shader.set("u_pointLightCount", nearest.length);
    shader.set("u_pointLights", flat);
    shader.set("u_pointLightColor", [1.6, 0.9, 0.4]);
  }

  return {
    gl,
    settings,
    setWorld,
    setOcean,
    queueModel,
    render,
    createModel: (data) => createMesh(gl, data),
    light: () => skyAtTime(settings.timeOfDay),
    chunkCount: () => chunks.size,
  };
}
