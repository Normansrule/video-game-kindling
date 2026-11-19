// templates/runner/main.js
// WHAT: An endless runner. Your character runs to the right by itself; jump over
//       cactuses, crates and spikes, stay low under bats, grab coins. It speeds up.
// WHY:  The whole genre is one trick: the player stays still and the WORLD moves
//       left. "distance" grows every frame, and everything is drawn at x - distance.
//       Obstacles are made just off the right edge and thrown away off the left.
// GROW IT: new obstacle kinds in OBSTACLES, a double jump, power-ups, a day-night
//       backdrop theme, or your own character from the character designer.

import { createGame } from "kindling/game.js";
import { createBackdrop } from "kindling/2d/backdrop.js";
import { text, dim } from "kindling/2d/draw.js";
import { createParticles, presets } from "kindling/2d/particles.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { createRandom } from "kindling/math/random.js";
import { createStorage } from "kindling/core/storage.js";
import { tileCanvas } from "kindling/library/tiles.js";
import { spriteFrames } from "kindling/library/sprites.js";
import { characterSheet } from "kindling/characters/character-sprite.js";
import { normalizeCharacter } from "kindling/characters/character-spec.js";

const WIDTH = 320, HEIGHT = 180, GROUND = 148, GRAVITY = 1000, JUMP = 340;

const game = createGame({
  width: WIDTH, height: HEIGHT, pixelArt: true, background: "#8fd3ff",
  actions: { jump: ["Space", "ArrowUp", "KeyW", "mouse:0", "pad:A", "touch:jump"], restart: ["KeyR", "Enter", "pad:Start"] },
});
game.input.touch.addButton("jump", 0, 0, WIDTH, HEIGHT, "");

// Your character: the first one saved in the character designer, or the default hero.
function savedLook() {
  try { return normalizeCharacter((JSON.parse(localStorage.getItem("kindling:characters")) || [])[0]); } catch { return normalizeCharacter({}); }
}
const sheet = characterSheet(savedLook());
const backdrop = createBackdrop({ width: WIDTH, height: HEIGHT, theme: "day" });
const random = createRandom();
const audio = createAudio();
const particles = createParticles(200);
const best = createStorage("kindling-runner");
const tiles = { ground: tileCanvas("grass_block"), dirt: tileCanvas("dirt") };

// Each obstacle: a picture, a hit box inside it, and how high off the ground it sits.
const OBSTACLES = [
  { kind: "cactus", image: tileCanvas("cactus"), box: [3, 0, 10, 16], lift: 0 },
  { kind: "crate", image: tileCanvas("crate"), box: [1, 1, 14, 15], lift: 0 },
  { kind: "spikes", image: tileCanvas("spikes"), box: [1, 9, 14, 7], lift: 0 },
  { kind: "bat", frames: spriteFrames("bat"), box: [1, 2, 10, 8], lift: 22 },
];
const coinFrames = spriteFrames("coin");

let player, things, distance, speed, coins, nextObstacle, nextCoins, state, time;
function reset() {
  player = { x: 48, y: GROUND - 20, velocityY: 0, onGround: true, width: 10, height: 18 };
  things = [];
  distance = 0;
  speed = 110;
  coins = 0;
  nextObstacle = 220;
  nextCoins = 160;
  state = "ready";
  time = 0;
}

function spawn() {
  // Space the obstacles by distance, and give a little more room as speed grows.
  if (distance > nextObstacle) {
    const type = random.pick(distance > 600 ? OBSTACLES : OBSTACLES.slice(0, 3));
    things.push({ ...type, x: distance + WIDTH + 16, y: GROUND - 16 - type.lift });
    if (type.kind !== "bat" && random.chance(Math.min(0.35, distance / 6000))) things.push({ ...type, x: distance + WIDTH + 32, y: GROUND - 16 });
    nextObstacle = distance + random.range(130, 220) + speed * 0.35;
  }
  if (distance > nextCoins) {
    // A little arc of coins: the arc is the jump, so it teaches the timing.
    for (let index = 0; index < 5; index++) things.push({ kind: "coin", frames: coinFrames, box: [0, 0, 12, 12], x: distance + WIDTH + index * 16, y: GROUND - 34 - Math.sin((index / 4) * Math.PI) * 30 });
    nextCoins = distance + random.range(260, 420);
  }
}

const hits = (thing) => {
  const [boxX, boxY, boxWidth, boxHeight] = thing.box;
  const left = thing.x - distance + boxX, top = thing.y + boxY;
  return player.x < left + boxWidth && player.x + player.width > left && player.y < top + boxHeight && player.y + player.height > top;
};

function update(game, step) {
  time += step;
  if (state === "ready") { if (game.actions.wasPressed("jump")) state = "running"; return; }
  if (state === "over") { particles.update(step); if (game.actions.wasPressed("restart") || (time > 0.6 && game.actions.wasPressed("jump"))) reset(); return; }

  speed = Math.min(300, speed + step * 4);       // a little faster every second
  distance += speed * step;
  spawn();

  // Jump: full height if you hold, a short hop if you tap (cut the rise on release).
  if (player.onGround && game.actions.wasPressed("jump")) { player.velocityY = -JUMP; player.onGround = false; playSfx(audio, "jump", 0.4); }
  if (!game.actions.isDown("jump") && player.velocityY < -120) player.velocityY = -120;
  player.velocityY += GRAVITY * step;
  player.y += player.velocityY * step;
  if (player.y + player.height >= GROUND) { player.y = GROUND - player.height; player.velocityY = 0; player.onGround = true; }

  for (const thing of things) {
    if (thing.gone || !hits(thing)) continue;
    if (thing.kind === "coin") {
      thing.gone = true;
      coins++;
      playSfx(audio, "coin", 0.4);
    } else {
      state = "over";
      time = 0;
      playSfx(audio, "hit");
      particles.emit({ ...presets.explosion, count: 20, x: player.x + 5, y: player.y + 9 });
      const score = Math.floor(distance / 10) + coins * 10;
      if (score > best.load("best", 0)) best.save("best", score);
    }
  }
  things = things.filter((thing) => !thing.gone && thing.x - distance > -40);
  particles.update(step);
}

function render(game, context) {
  backdrop.render(context, distance * 0.5, 0, time);
  // Ground: tiles that repeat every 16 px, shifted by the distance run.
  const shift = -Math.floor(distance % 16);
  for (let x = shift; x < WIDTH + 16; x += 16) {
    context.drawImage(tiles.ground, x, GROUND);
    context.drawImage(tiles.dirt, x, GROUND + 16);
  }
  for (const thing of things) {
    const image = thing.frames ? thing.frames[Math.floor(time * 6) % thing.frames.length] : thing.image;
    context.drawImage(image, Math.round(thing.x - distance), Math.round(thing.y));
  }
  // Running animation speed follows the game speed; in the air, hold one pose.
  const list = sheet.frames.walkRight;
  const frame = player.onGround && state === "running" ? list[Math.floor(distance / 14) % list.length] : list[0];
  if (state !== "over") context.drawImage(sheet.canvas, frame.x, frame.y, frame.width, frame.height, Math.round(player.x - 3), Math.round(player.y - 2), frame.width, frame.height);
  particles.render(context);

  const score = Math.floor(distance / 10) + coins * 10;
  text(context, "SCORE " + score + "   COINS " + coins + "   BEST " + best.load("best", 0), 6, 6, { color: "#16324a", bold: true });
  if (state === "ready") {
    text(context, "RUNNER", WIDTH / 2, 50, { size: 22, align: "center", bold: true, color: "#16324a" });
    text(context, "Space, click or tap to jump. Hold for a higher jump.", WIDTH / 2, 82, { align: "center", color: "#16324a" });
  }
  if (state === "over") {
    dim(context, WIDTH, HEIGHT, 0.55);
    text(context, "OUCH!", WIDTH / 2, 58, { size: 18, align: "center", bold: true, color: "#ff6b81" });
    text(context, "Score " + score + " · best " + best.load("best", 0), WIDTH / 2, 86, { align: "center" });
    text(context, "Jump or R to run again", WIDTH / 2, 104, { align: "center", color: "#cccccc" });
  }
}

reset();
game.scenes.add("play", { update, render });
game.start("play");
