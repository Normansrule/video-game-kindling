// tiny/kindling-tiny.js
// WHAT: The smallest useful slice of Kindling in one file: a fixed-step loop,
//       keyboard and touch input, box collision against a text tile grid,
//       a seeded random number generator, beeps and saved high scores.
// WHY:  js13kGames (and other size-limited jams) cap the zipped game at 13 kilobytes.
//       The full engine is far bigger than that. This file is about 2 KB once
//       packed, so most of the budget is left for your game.
//       Every function here has a bigger, commented twin in engine/ (named below).
// USE:  import { start, down, hit, ... } from "./kindling-tiny.js";
// DOC:  tiny/README.md   PACK: node tiny/pack.mjs <your-game-folder>

// ---- Input (engine/input/keyboard.js, engine/input/touch.js) -----------------
const held = new Set();     // keys down right now, by KeyboardEvent.code ("ArrowLeft", "Space")
const fresh = new Set();    // keys pressed since the last step
export const pointer = { x: 0, y: 0, down: false, hit: false };
// globalThis...?. so Node can import this file for the tests (Node has no window events).
const on = (type, handler) => globalThis.addEventListener?.(type, handler);

on("keydown", (event) => {
  if (!event.repeat) fresh.add(event.code);
  held.add(event.code);
  if (event.code.startsWith("Arrow") || event.code === "Space") event.preventDefault();
});
on("keyup", (event) => held.delete(event.code));
on("blur", () => held.clear());

// Is any of these keys held? down("ArrowLeft", "KeyA")
export const down = (...codes) => codes.some((code) => held.has(code));
// Was any of these keys pressed this step? (true for exactly one step)
export const hit = (...codes) => codes.some((code) => fresh.has(code));

// ---- Math (engine/math/scalar.js, engine/math/random.js) ---------------------
export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const lerp = (a, b, t) => a + (b - a) * t;

// Seeded random numbers (mulberry32): the same seed gives the same level every time.
export function random(seed = 1) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Collision (engine/2d/collision.js, engine/2d/physics.js) ----------------
// Do two boxes {x, y, w, h} overlap? Touching edges do not count.
export const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// A level written as text, one character per tile. solid("#") tells move() what blocks.
export function grid(rows, tile = 8, solidChars = "#") {
  const map = {
    rows, tile, w: rows[0].length * tile, h: rows.length * tile,
    at: (column, row) => (rows[row] || "")[column] || "#",   // outside the map is solid
    solid: (x, y) => solidChars.includes(map.at(Math.floor(x / tile), Math.floor(y / tile))),
    // Every tile with this character, as {x, y} in pixels.
    find(character) {
      const spots = [];
      rows.forEach((line, row) => [...line].forEach((c, column) => c === character && spots.push({ x: column * tile, y: row * tile })));
      return spots;
    },
  };
  return map;
}

// Move a body {x, y, w, h, vx, vy} through the grid one axis at a time, so it
// slides along walls. Sets body.ground when it lands. (Same idea as moveAndCollide.)
export function move(body, seconds, map) {
  const tile = map.tile;
  body.ground = false;
  body.x += body.vx * seconds;
  if (hitsGrid(body, map)) {
    // Snap to the edge of the tile we ran into, then stop.
    body.x = body.vx > 0 ? Math.floor((body.x + body.w - EDGE) / tile) * tile - body.w : (Math.floor(body.x / tile) + 1) * tile;
    body.vx = 0;
  }
  body.y += body.vy * seconds;
  if (hitsGrid(body, map)) {
    if (body.vy > 0) {
      body.y = Math.floor((body.y + body.h - EDGE) / tile) * tile - body.h;
      body.ground = true;
    } else {
      body.y = (Math.floor(body.y / tile) + 1) * tile;
    }
    body.vy = 0;
  }
}

// A box that ends exactly on a tile edge is not inside the next tile.
const EDGE = 0.01;

function hitsGrid(body, map) {
  // Check the four corners. Fine while bodies are no bigger than one tile.
  const right = body.x + body.w - EDGE;
  const bottom = body.y + body.h - EDGE;
  return map.solid(body.x, body.y) || map.solid(right, body.y) || map.solid(body.x, bottom) || map.solid(right, bottom);
}

// ---- Sound (engine/audio/sfx.js) ----------------------------------------------
let audio = null;
// A short synth note. Browsers only allow sound after a key press or tap,
// so call it from input, never on page load.
export function beep(frequency = 440, seconds = 0.1, type = "square", volume = 0.15, slideTo = frequency) {
  try {
    audio = audio || new AudioContext();
    const now = audio.currentTime;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + seconds);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + seconds);
  } catch {
    // No Web Audio (or blocked): the game still runs, silently.
  }
}

// ---- Saving (engine/core/storage.js) -------------------------------------------
export function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}
export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private window or storage blocked: nothing is saved, nothing breaks.
  }
}

// ---- Drawing helpers (engine/2d/draw.js) -------------------------------------
export function text(context, message, x, y, size = 8, color = "#fff", align = "center") {
  context.fillStyle = color;
  context.font = size + "px monospace";
  context.textAlign = align;
  context.fillText(message, x, y);
}

// ---- The loop (engine/core/loop.js, engine/core/canvas.js) -------------------
// options: width, height (the game's pixel size), update(seconds), draw(context),
//          background (CSS color). The canvas is scaled up with crisp pixels.
export function start({ width = 160, height = 120, update, draw, background = "#000" }) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.style.cssText = "display:block;margin:auto;max-width:100%;max-height:100vh;aspect-ratio:" + width + "/" + height + ";width:100vw;image-rendering:pixelated;touch-action:none";
  document.body.style.cssText = "margin:0;min-height:100vh;display:grid;place-items:center;background:" + background;
  document.body.append(canvas);
  const context = canvas.getContext("2d");

  // Pointer (mouse or touch) in game pixels.
  const place = (event) => {
    const box = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - box.left) / box.width) * width;
    pointer.y = ((event.clientY - box.top) / box.height) * height;
  };
  canvas.addEventListener("pointerdown", (event) => { place(event); pointer.down = pointer.hit = true; });
  canvas.addEventListener("pointermove", place);
  on("pointerup", () => (pointer.down = false));

  // Fixed timestep: update() always gets 1/60 s, however fast the screen is.
  const step = 1 / 60;
  let last = performance.now();
  let saved = 0;
  function frame(now) {
    saved += Math.min(0.25, (now - last) / 1000);   // clamp so a hidden tab can't explode
    last = now;
    while (saved >= step) {
      update(step);
      fresh.clear();
      pointer.hit = false;
      saved -= step;
    }
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    draw(context);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { canvas, context, width, height };
}
