// samples/2d/04-platformer/main.js
// WHAT: A platformer: run, jump, collect coins, stomp enemies, reach the flag.
// WHY:  The "feel" of a platformer comes from small tricks that players never notice:
//       coyote time, jump buffering and variable jump height. They're all here,
//       each a few lines, each with a number you can tune.
// TEACHES: tilemap + physics, camera follow, sprite animation, game feel,
//          parallax backdrop and procedural tile textures (Kindling 2 look).
// README: samples/2d/04-platformer/README.md

import { createGame } from "kindling/game.js";
import { loadImages } from "kindling/core/assets.js";
import { createTilemap } from "kindling/2d/tilemap.js";
import { createBody, moveAndCollide } from "kindling/2d/physics.js";
import { createCamera } from "kindling/2d/camera.js";
import { createSpriteSheet } from "kindling/2d/sprite.js";
import { createAnimation, createAnimator } from "kindling/2d/animation.js";
import { rectsOverlap } from "kindling/2d/collision.js";
import { createParticles, presets } from "kindling/2d/particles.js";
import { text, dim } from "kindling/2d/draw.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { approach } from "kindling/math/scalar.js";
import { createBackdrop } from "kindling/2d/backdrop.js";
import { textureCanvases } from "kindling/world/textures.js";
import { paintPixels } from "kindling/views/sprites.js";
import { LEVELS } from "./level.js";

// ---- Feel: tune these ----------------------------------------------------------
const RUN_SPEED = 95;            // px/s
const ACCELERATION = 900;        // px/s² toward RUN_SPEED
const FRICTION = 1200;           // px/s² toward 0 when no key is held
const GRAVITY = 900;
const JUMP_SPEED = 290;
const JUMP_CUT = 0.45;           // releasing jump early multiplies upward speed by this
const COYOTE_SECONDS = 0.1;      // you can still jump this long after walking off a ledge
const JUMP_BUFFER_SECONDS = 0.12;// a jump pressed this long before landing still happens
const STOMP_BOUNCE = 220;
const ENEMY_SPEED = 30;
const TILE = 16;

const game = createGame({
  width: 320,
  height: 180,
  pixelArt: true,
  background: "#1d2235",
  actions: {
    left: ["ArrowLeft", "KeyA", "pad:Left", "pad:LeftX-", "touch:left"],
    right: ["ArrowRight", "KeyD", "pad:Right", "pad:LeftX+", "touch:right"],
    jump: ["Space", "ArrowUp", "KeyW", "KeyZ", "pad:A", "touch:jump"],
  },
});
game.input.touch.addButton("left", 4, 140, 36, 36, "◀");
game.input.touch.addButton("right", 44, 140, 36, 36, "▶");
game.input.touch.addButton("jump", 280, 140, 36, 36, "▲");

const images = await loadImages({ hero: "./hero.png", tiles: "./tiles.png" });
const heroSheet = createSpriteSheet(images.hero, 16, 16);
const tileSheet = createSpriteSheet(images.tiles, 16, 16);
const TILE_FRAMES = { "#": 0, B: 2, "=": 3, "^": 5, F: 6 };

const audio = createAudio();
const particles = createParticles(300);

// ---- Look: painted from code (see engine/2d/backdrop.js and engine/world/textures.js) ----
const backdrop = createBackdrop({ width: 320, height: 180, theme: "day" });
const blockTextures = textureCanvases();     // 16 x 16 grass, dirt, brick, planks...
// Which texture each level character uses. Spikes and the flag still come from tiles.png.
const TILE_TEXTURES = { "#": "dirt", B: "brick", "=": "planks" };
const slimeFrames = [
  paintPixels(["...gggg...", "..gGGGGg..", ".gGwkGwkg.", "gGGwkGwkGg", "gGGGGGGGGg", "gggggggggg"], { g: "#c2455a", G: "#ef6a7d", w: "#ffffff", k: "#1b1b25" }),
  paintPixels(["..........", "...gggg...", ".ggGGGGgg.", "gGGwkGwkGg", "gGGGGGGGGg", "gggggggggg"], { g: "#c2455a", G: "#ef6a7d", w: "#ffffff", k: "#1b1b25" }),
];

// A soft dark frame around the screen pulls the eye to the middle (a "vignette").
const vignette = document.createElement("canvas");
vignette.width = 320;
vignette.height = 180;
{
  const vignetteContext = vignette.getContext("2d");
  const shade = vignetteContext.createRadialGradient(160, 90, 60, 160, 90, 200);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(10,10,30,0.45)");
  vignetteContext.fillStyle = shade;
  vignetteContext.fillRect(0, 0, 320, 180);
}

// ---- Level state (rebuilt by loadLevel) ---------------------------------------
let levelIndex = 0;
let map = null;
let camera = null;
let player = null;
let coins = [];
let enemies = [];
let flag = null;
let score = 0;
let coyoteTimer = 0;
let jumpBufferTimer = 0;
let facingLeft = false;
const animator = createAnimator({
  idle: createAnimation([0, 1], 2),
  run: createAnimation([2, 3, 4, 5], 12),
  jump: createAnimation([6], 1),
  fall: createAnimation([7], 1),
});

function loadLevel(index) {
  levelIndex = index;
  map = createTilemap({ tileSize: TILE, rows: LEVELS[index], solid: "#B", oneWay: "=" });
  // Marker characters become empty tiles once we've read where they are.
  const start = map.replace("P", ".")[0];
  coins = map.replace("C", ".").map((spot) => ({ x: spot.x + 4, y: spot.y + 4, width: 8, height: 8 }));
  enemies = map.replace("E", ".").map((spot) => createBody({ x: spot.x + 2, y: spot.y + 4, width: 12, height: 12, gravity: GRAVITY, velocityX: -ENEMY_SPEED }));
  const flagSpot = map.find("F")[0];
  flag = { x: flagSpot.x + 2, y: flagSpot.y, width: 8, height: 16 };
  player = createBody({ x: start.x + 3, y: start.y + 2, width: 10, height: 14, gravity: GRAVITY });
  camera = createCamera({ width: 320, height: 180, smoothing: 10, deadZone: { width: 24, height: 40 },
    bounds: { x: 0, y: 0, width: map.width, height: map.height } });
  camera.centerOn(player.x, player.y);
}

function hurtPlayer() {
  playSfx(audio, "lose");
  camera.shake(5, 0.3);
  particles.emit({ ...presets.blood, x: player.x + 5, y: player.y + 7 });
  loadLevel(levelIndex);   // restart this level
}

function updatePlayer(stepSeconds) {
  const direction = game.actions.axis("left", "right");
  if (direction !== 0) {
    player.velocityX = approach(player.velocityX, direction * RUN_SPEED, ACCELERATION * stepSeconds);
    facingLeft = direction < 0;
  } else {
    player.velocityX = approach(player.velocityX, 0, FRICTION * stepSeconds);
  }

  // Coyote time: count down after leaving the ground.
  coyoteTimer = player.onGround ? COYOTE_SECONDS : coyoteTimer - stepSeconds;
  // Jump buffer: remember a jump press for a moment.
  jumpBufferTimer = game.actions.wasPressed("jump") ? JUMP_BUFFER_SECONDS : jumpBufferTimer - stepSeconds;

  if (jumpBufferTimer > 0 && coyoteTimer > 0) {
    player.velocityY = -JUMP_SPEED;
    jumpBufferTimer = 0;
    coyoteTimer = 0;
    playSfx(audio, "jump");
    particles.emit({ ...presets.dust, x: player.x + 5, y: player.y + 14 });
  }
  // Variable height: let go of jump while rising and you stop rising sooner.
  if (!game.actions.isDown("jump") && player.velocityY < 0) {
    player.velocityY = player.velocityY * Math.pow(JUMP_CUT, stepSeconds * 60);
  }

  const wasOnGround = player.onGround;
  moveAndCollide(player, stepSeconds, map);
  if (player.onGround && !wasOnGround) particles.emit({ ...presets.dust, count: 4, x: player.x + 5, y: player.y + 14 });

  // Animation follows the physics state.
  if (!player.onGround) animator.play(player.velocityY < 0 ? "jump" : "fall");
  else animator.play(Math.abs(player.velocityX) > 5 ? "run" : "idle");
  animator.update(stepSeconds);

  // Spikes: check the tile under the middle of the player's feet.
  const footCharacter = map.get(map.columnAt(player.x + 5), map.rowAt(player.y + 15));
  if (footCharacter === "^" || player.y > map.height) hurtPlayer();
}

function updateWorld(stepSeconds) {
  for (const coin of coins) {
    if (!coin.taken && rectsOverlap(player, coin)) {
      coin.taken = true;
      score += 1;
      playSfx(audio, "coin");
      particles.emit({ ...presets.sparkle, x: coin.x + 4, y: coin.y + 4 });
    }
  }
  for (const enemy of enemies) {
    if (enemy.dead) continue;
    moveAndCollide(enemy, stepSeconds, map);
    // Turn around at walls and at ledges (no ground ahead).
    const aheadX = enemy.velocityX > 0 ? enemy.x + enemy.width + 1 : enemy.x - 1;
    const groundAhead = map.isSolidAt(aheadX, enemy.y + enemy.height + 1);
    if (enemy.touching.left) enemy.velocityX = ENEMY_SPEED;
    else if (enemy.touching.right) enemy.velocityX = -ENEMY_SPEED;
    else if (enemy.onGround && !groundAhead) enemy.velocityX = -enemy.velocityX;
    if (rectsOverlap(player, enemy)) {
      // Falling onto it from above = stomp. Anything else = ouch.
      if (player.velocityY > 0 && player.y + player.height - enemy.y < 8) {
        enemy.dead = true;
        player.velocityY = -STOMP_BOUNCE;
        playSfx(audio, "hit");
        camera.shake(3, 0.2);
        particles.emit({ ...presets.explosion, count: 15, x: enemy.x + 6, y: enemy.y + 6 });
      } else {
        hurtPlayer();
        return;
      }
    }
  }
  if (rectsOverlap(player, flag)) {
    playSfx(audio, "powerup");
    game.scenes.push("levelDone");
  }
}

game.scenes.add("play", {
  enter() {
    score = 0;
    loadLevel(0);
  },
  update(game, stepSeconds) {
    updatePlayer(stepSeconds);
    updateWorld(stepSeconds);
    particles.update(stepSeconds);
    camera.follow(player, stepSeconds);
    camera.update(stepSeconds);
    game.debug.watch("velocityX", player.velocityX);
    game.debug.watch("velocityY", player.velocityY);
    game.debug.watch("coyote", coyoteTimer);
  },
  render(game, context) {
    backdrop.render(context, camera.x, camera.y, game.time.elapsed);
    camera.begin(context);
    map.draw(context, (tileContext, character, x, y, column, row) => {
      let textureName = TILE_TEXTURES[character];
      if (textureName) {
        // Ground with nothing solid above it gets the grass-topped texture.
        if (character === "#" && !"#B".includes(map.get(column, row - 1) || "#")) textureName = "grass_side";
        if (character === "=") {
          tileContext.drawImage(blockTextures.planks, 0, 0, 16, 6, x, y, 16, 6);   // a thin plank
          return;
        }
        tileContext.drawImage(blockTextures[textureName], x, y);
        // Darken tiles deeper underground, so the surface pops.
        const depth = character === "#" && "#B".includes(map.get(column, row - 1) || ".") ? 0.18 : 0;
        if (depth) { tileContext.fillStyle = "rgba(20,10,30," + depth + ")"; tileContext.fillRect(x, y, 16, 16); }
        return;
      }
      const frame = TILE_FRAMES[character];
      if (frame !== undefined) tileSheet.draw(tileContext, frame, x, y);
    }, camera.view());
    for (const coin of coins) {
      if (!coin.taken) tileSheet.draw(context, 4, coin.x - 4, coin.y - 4 + Math.round(Math.sin(game.time.elapsed * 4 + coin.x) * 1.5));
    }
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      // A two-frame squishy slime, sitting on the enemy's collision box.
      const slime = slimeFrames[Math.floor(game.time.elapsed * 4 + enemy.x * 0.1) % 2];
      context.save();
      context.translate(Math.round(enemy.x + enemy.width / 2), Math.round(enemy.y + enemy.height));
      if (enemy.velocityX > 0) context.scale(-1, 1);
      context.drawImage(slime, -7, -10, 14, 10);
      context.restore();
    }
    heroSheet.draw(context, animator.frame(), player.x + 5, player.y + 14, { originX: 0.5, originY: 14 / 16, flipX: facingLeft });
    particles.render(context);
    camera.end(context);
    context.drawImage(vignette, 0, 0);
    text(context, "COINS " + score + "   LEVEL " + (levelIndex + 1), 6, 6, { shadow: "#000000" });
    game.debug.box(player.x - camera.x, player.y - camera.y, player.width, player.height);
  },
});

game.scenes.add("levelDone", {
  update(game) {
    if (game.actions.wasPressed("jump") || game.input.touch.wasTapped()) {
      game.scenes.pop();
      if (levelIndex + 1 < LEVELS.length) loadLevel(levelIndex + 1);
      else game.scenes.switchTo("play");
    }
  },
  render(game, context) {
    dim(context, 320, 180, 0.6);
    const last = levelIndex + 1 >= LEVELS.length;
    text(context, last ? "YOU FINISHED KINDLING LAND!" : "LEVEL COMPLETE", 160, 70, { align: "center", size: 8, bold: true, color: "#ffd166" });
    text(context, "Coins: " + score, 160, 90, { align: "center" });
    text(context, last ? "Jump to play again" : "Jump for the next level", 160, 110, { align: "center", color: "#aaaaaa" });
  },
});

game.start("play");
