// main.js: a complete tiny game to start a jam from ("Dodge").
// WHAT: Title screen -> play -> game over, with pause, mute, a saved best score,
//       sound effects, particles, screen shake, keyboard, gamepad and touch.
// WHY:  At hour 0 of a jam you want a game that already runs and already has the
//       boring parts done. Replace the "CHANGE ME" parts with your idea.
// DOC:  Kindling docs: https://github.com/Normansrule/video-game-kindling/tree/main/docs
//       Cheat sheet:   https://github.com/Normansrule/video-game-kindling/blob/main/docs/CHEATSHEET.md

import { createGame } from "kindling/game.js";
import { fillRect, fillCircle, text, dim } from "kindling/2d/draw.js";
import { rectsOverlap } from "kindling/2d/collision.js";
import { createParticles, presets } from "kindling/2d/particles.js";
import { createCamera } from "kindling/2d/camera.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { createStorage } from "kindling/core/storage.js";
import { createRandom } from "kindling/math/random.js";
import { clamp } from "kindling/math/scalar.js";

// ---- CHANGE ME: the game's name and feel -------------------------------------
const TITLE = "DODGE";
const WIDTH = 320;
const HEIGHT = 180;
const PLAYER_SPEED = 140;      // pixels per second
const START_SPAWN_SECONDS = 0.7;

const game = createGame({
  width: WIDTH,
  height: HEIGHT,
  background: "#14161b",
  actions: {
    left: ["ArrowLeft", "KeyA", "pad:Left", "pad:LeftX-", "touch:left"],
    right: ["ArrowRight", "KeyD", "pad:Right", "pad:LeftX+", "touch:right"],
    start: ["Space", "Enter", "pad:A", "pad:Start", "mouse:0"],
    pause: ["KeyP", "Escape", "pad:Start"],
    mute: ["KeyM"],
  },
});
const touch = game.input.touch;
touch.addButton("left", 0, 0, WIDTH / 2, HEIGHT, "◀");      // left half of the screen
touch.addButton("right", WIDTH / 2, 0, WIDTH / 2, HEIGHT, "▶");

const audio = createAudio();
const particles = createParticles(400);
const camera = createCamera({ width: WIDTH, height: HEIGHT, smoothing: 0 });
const storage = createStorage("my-kindling-game");   // CHANGE ME: one name per game
const random = createRandom();
game.state.best = storage.load("best", 0);

// Mute works on every screen.
function handleMute() {
  if (game.actions.wasPressed("mute")) audio.toggleMute();
}

// ---- Title ---------------------------------------------------------------------
game.scenes.add("title", {
  update(game) {
    handleMute();
    if (game.actions.wasPressed("start") || touch.wasTapped()) game.scenes.switchTo("play");
  },
  render(game, context) {
    text(context, TITLE, WIDTH / 2, 50, { size: 24, align: "center", bold: true, color: "#ffb347" });
    text(context, "Dodge the falling blocks", WIDTH / 2, 84, { align: "center", color: "#cccccc" });
    text(context, "← → or A D to move · P pause · M mute", WIDTH / 2, 100, { align: "center", color: "#8a8f9c" });
    const blink = Math.floor(game.time.elapsed * 2) % 2 === 0;
    if (blink) text(context, "Press Space, click or tap to start", WIDTH / 2, 130, { align: "center" });
    if (game.state.best > 0) text(context, "Best " + game.state.best.toFixed(1) + " s", WIDTH / 2, 156, { align: "center", color: "#ffd23f" });
  },
});

// ---- Play: CHANGE ME, this is your game ----------------------------------------
const player = { x: WIDTH / 2 - 6, y: HEIGHT - 20, width: 12, height: 12 };
let blocks = [];
let spawnTimer = 0;
let survived = 0;

game.scenes.add("play", {
  enter() {
    player.x = WIDTH / 2 - player.width / 2;
    blocks = [];
    spawnTimer = 0;
    survived = 0;
    particles.clear();
  },
  update(game, stepSeconds) {
    handleMute();
    if (game.actions.wasPressed("pause")) {
      game.scenes.push("pause");
      return;
    }
    survived += stepSeconds;
    player.x += game.actions.axis("left", "right") * PLAYER_SPEED * stepSeconds;
    player.x = clamp(player.x, 0, WIDTH - player.width);

    // Spawn faster as time goes on: the difficulty curve in one line.
    spawnTimer -= stepSeconds;
    if (spawnTimer <= 0) {
      const size = random.int(6, 14);
      blocks.push({ x: random.range(0, WIDTH - size), y: -size, width: size, height: size, speed: random.range(60, 100) + survived * 3 });
      spawnTimer = Math.max(0.15, START_SPAWN_SECONDS - survived * 0.01);
    }
    for (const block of blocks) block.y += block.speed * stepSeconds;
    blocks = blocks.filter((block) => block.y < HEIGHT + 20);

    if (blocks.some((block) => rectsOverlap(player, block))) {
      playSfx(audio, "explosion");
      camera.shake(6, 0.4);
      particles.emit({ ...presets.explosion, x: player.x + 6, y: player.y + 6 });
      game.scenes.push("gameOver", { seconds: survived });
    }
    particles.update(stepSeconds);
    camera.update(stepSeconds);
  },
  render(game, context) {
    camera.begin(context);
    for (const block of blocks) fillRect(context, block.x, block.y, block.width, block.height, "#e05a7a");
    fillRect(context, player.x, player.y, player.width, player.height, "#4fa3ff");
    fillCircle(context, player.x + 6, player.y + 4, 1.5, "#ffffff");
    particles.render(context, true);
    camera.end(context);
    text(context, survived.toFixed(1) + " s", 6, 6, { color: "#cccccc", shadow: "#000000" });
    if (audio.isMuted()) text(context, "muted", WIDTH - 6, 6, { align: "right", color: "#8a8f9c" });
  },
});

// ---- Pause (drawn over the frozen game) -----------------------------------------
game.scenes.add("pause", {
  update(game) {
    handleMute();
    if (game.actions.wasPressed("pause") || game.actions.wasPressed("start")) game.scenes.pop();
  },
  render(game, context) {
    dim(context, WIDTH, HEIGHT, 0.6);
    text(context, "PAUSED", WIDTH / 2, 76, { size: 16, align: "center", bold: true });
    text(context, "P or Space to carry on", WIDTH / 2, 100, { align: "center", color: "#cccccc" });
  },
});

// ---- Game over -------------------------------------------------------------------
let lastRun = { seconds: 0, newBest: false };
game.scenes.add("gameOver", {
  enter(game, data) {
    const newBest = data.seconds > game.state.best;
    if (newBest) {
      game.state.best = data.seconds;
      storage.save("best", data.seconds);
    }
    lastRun = { seconds: data.seconds, newBest };
  },
  update(game, stepSeconds) {
    particles.update(stepSeconds);   // let the explosion finish behind the message
    camera.update(stepSeconds);
    if (game.actions.wasPressed("start") || touch.wasTapped()) game.scenes.switchTo("play");
  },
  render(game, context) {
    dim(context, WIDTH, HEIGHT, 0.55);
    text(context, "GAME OVER", WIDTH / 2, 60, { size: 16, align: "center", bold: true, color: "#e05a7a" });
    text(context, "You lasted " + lastRun.seconds.toFixed(1) + " s", WIDTH / 2, 86, { align: "center" });
    text(context, lastRun.newBest ? "New best!" : "Best " + game.state.best.toFixed(1) + " s", WIDTH / 2, 102, { align: "center", color: "#ffd23f" });
    text(context, "Space, click or tap to play again", WIDTH / 2, 132, { align: "center", color: "#aaaaaa" });
  },
});

game.start("title");
