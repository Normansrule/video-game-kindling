// engine/scene/runtime.js
// WHAT: Plays a scene: turns the tile layers into a level, the entities into living
//       things with behaviors, follows the player with a camera, draws a HUD (hearts,
//       coins, keys), and handles winning, losing and restarting.
// WHY:  The scene editor's Play button and your own game use the same function, so
//       what you test in the editor is exactly what ships.
// DOC:  docs/modules/scene.md (section "Playing a scene")
//
// Usage:
//   import { runScene } from "kindling/scene/runtime.js";
//   const scene = await (await fetch("./level-1.json")).json();
//   const play = runScene(scene, { canvas: "#game" });      // play.restart(), play.destroy()

import { createGame } from "../game.js";
import { createTilemap } from "../2d/tilemap.js";
import { createBackdrop } from "../2d/backdrop.js";
import { createAudio } from "../audio/audio.js";
import { playSfx } from "../audio/sfx.js";
import { tileInfo, tileCanvas } from "../library/tiles.js";
import { spriteFrames } from "../library/sprites.js";
import { characterSheet } from "../characters/character-sprite.js";
import { randomCharacter, defaultCharacter } from "../characters/character-spec.js";
import { parseScene, getTile } from "./scene.js";
import { overlaps, updatePlayer, updatePatrol, updateChase, updateFly, updateBody, touchPlayer, GRAVITY } from "./behaviors.js";

const ACTIONS = {
  left: ["KeyA", "ArrowLeft", "pad:Left", "pad:LeftX-"], right: ["KeyD", "ArrowRight", "pad:Right", "pad:LeftX+"],
  up: ["KeyW", "ArrowUp", "pad:Up", "pad:LeftY-"], down: ["KeyS", "ArrowDown", "pad:Down", "pad:LeftY+"],
  jump: ["Space", "KeyW", "ArrowUp", "pad:A"], action: ["KeyE", "Enter", "pad:X"], restart: ["KeyR", "pad:Start"],
};

// options: canvas, width (320), height (180), onWin(message), onLose()
export function runScene(input, options = {}) {
  // Work on a copy, so playing never changes the scene you passed in (the editor's copy).
  const scene = parseScene(typeof input === "string" ? input : JSON.parse(JSON.stringify(input)));
  const size = scene.tileSize;
  const platformer = scene.template === "platformer";
  const game = createGame({ canvas: options.canvas, width: options.width || 320, height: options.height || 180, pixelArt: true, background: scene.background, actions: platformer ? ACTIONS : { ...ACTIONS, jump: ["Space", "pad:A"] } });
  const audio = createAudio();
  const backdrop = platformer ? createBackdrop({ width: game.width, height: game.height, theme: options.theme || "day" }) : null;

  // ---- The level: one tilemap for collision, one pre-drawn picture for looks ----
  const letters = (test) => Object.keys(scene.legend).filter((letter) => test(tileInfo(scene.legend[letter]))).join("");
  const map = createTilemap({ rows: scene.layers.main, tileSize: size, solid: letters((tile) => tile.solid && !tile.oneWay), oneWay: letters((tile) => tile.oneWay) });
  const picture = document.createElement("canvas");
  picture.width = scene.width * size;
  picture.height = scene.height * size;
  const paint = picture.getContext("2d");
  for (let row = 0; row < scene.height; row++) {
    for (let column = 0; column < scene.width; column++) {
      if (scene.fill) paint.drawImage(tileCanvas(scene.fill), column * size, row * size);
      for (const layer of ["back", "main"]) {
        const name = getTile(scene, layer, column, row);
        if (name) paint.drawImage(tileCanvas(name), column * size, row * size);
      }
    }
  }

  let world;
  function build() {
    const things = scene.entities.map((data) => {
      const body = data.components.body || { width: 12, height: 12 };
      return {
        id: data.id, name: data.name, components: data.components, look: data.look,
        x: data.x, y: data.y, width: body.width, height: body.height, homeY: data.y,
        velocityX: 0, velocityY: 0, gravity: 0, maxFallSpeed: 600, bounce: 0, onGround: false,
        touching: { left: false, right: false, top: false, bottom: false },
        facing: "down", walking: false, alive: true, invincible: 0, coyote: 0,
      };
    });
    const player = things.find((thing) => thing.components.player) || null;
    world = {
      platformer, things, player, time: 0, coins: 0, keys: 0, score: 0,
      hearts: player ? player.components.player.lives : 0, start: player ? { x: player.x, y: player.y } : null,
      width: scene.width * size, height: scene.height * size, state: "playing", message: "", talk: null, effects: [],
      actions: game.actions,
      // Doors are solid until opened, so the world for physics is tiles + closed doors.
      solids: { solidsNear: (area) => map.solidsNear(area).concat(things.filter((thing) => thing.alive && thing.components.door && overlaps(thing, area))) },
      isSolidPoint: (x, y) => map.isSolid(map.columnAt(x), map.rowAt(y)) || Boolean(tileInfo(getTile(scene, "main", Math.floor(x / size), Math.floor(y / size)))?.oneWay),
      tileFlagsAt(area, flag) {
        for (let row = Math.floor(area.y / size); row <= Math.floor((area.y + area.height - 1) / size); row++) {
          for (let column = Math.floor(area.x / size); column <= Math.floor((area.x + area.width - 1) / size); column++) {
            const tile = tileInfo(getTile(scene, "main", column, row));
            if (tile && tile[flag]) return true;
          }
        }
        return false;
      },
      sound: (name) => playSfx(audio, name),
      burst: (thing, sprite) => world.effects.push({ x: thing.x + thing.width / 2, y: thing.y + thing.height / 2, sprite, age: 0 }),
      collect(kind, value, thing) {
        if (kind === "coin" || kind === "gem" || kind === "star") { world.coins += value; world.score += value * 10; }
        if (kind === "key") world.keys += value;
        if (kind === "heart") world.hearts = Math.min(world.hearts + value, 9);
        world.burst(thing, "spark");
        world.sound(kind === "key" || kind === "heart" ? "powerup" : "coin");
      },
      hurtPlayer(damage, respawn = false) {
        if (!player || world.state !== "playing" || (player.invincible > 0 && !respawn)) return;
        world.hearts -= damage;
        player.invincible = 1.2;
        world.sound("hit");
        if (world.hearts <= 0) { world.state = "lost"; world.sound("lose"); if (options.onLose) options.onLose(); return; }
        if (respawn) { player.x = world.start.x; player.y = world.start.y; player.velocityX = player.velocityY = 0; }
      },
      win(message) {
        if (world.state !== "playing") return;
        world.state = "won";
        world.message = message;
        world.sound("powerup");
        if (options.onWin) options.onWin(message);
      },
    };
  }
  build();

  // ---- Looks: character sheets and sprite frames, made once per entity ----
  const looks = new Map();
  function lookFor(thing) {
    if (looks.has(thing.id)) return looks.get(thing.id);
    let look;
    const image = thing.components.sprite ? thing.components.sprite.image : "coin";
    if (image === "character") {
      const spec = thing.look && thing.look.skin ? thing.look : thing.look && thing.look.seed ? randomCharacter(thing.look.seed) : defaultCharacter();
      look = { kind: "character", sheet: characterSheet(spec) };
    } else if (image.startsWith("tile:")) look = { kind: "frames", frames: [tileCanvas(image.slice(5))] };
    else look = { kind: "frames", frames: spriteFrames(image) };
    looks.set(thing.id, look);
    return look;
  }

  function drawThing(context, thing) {
    const look = lookFor(thing);
    const scale = thing.components.sprite ? thing.components.sprite.scale : 1;
    if (thing.invincible > 0 && Math.floor(world.time * 20) % 2) return;     // blink while hurt
    if (look.kind === "character") {
      const direction = platformer ? (thing.facing === "left" ? "Left" : "Right") : thing.facing[0].toUpperCase() + thing.facing.slice(1);
      const list = look.sheet.frames[(thing.walking ? "walk" : "idle") + direction];
      const frame = list[Math.floor(world.time * 8) % list.length];
      const x = Math.round(thing.x + thing.width / 2 - frame.width / 2);
      const y = Math.round(thing.y + thing.height - frame.height);
      context.drawImage(look.sheet.canvas, frame.x, frame.y, frame.width, frame.height, x, y, frame.width, frame.height);
      return;
    }
    const animate = !thing.components.sprite || thing.components.sprite.animate;
    const image = look.frames[animate ? Math.floor(world.time * 4) % look.frames.length : 0];
    const width = image.width * scale;
    const height = image.height * scale;
    const x = Math.round(thing.x + thing.width / 2 - width / 2);
    const y = Math.round(thing.y + thing.height - height);
    if (thing.facing === "left") {
      context.save(); context.translate(x + width, y); context.scale(-1, 1); context.drawImage(image, 0, 0, width, height); context.restore();
    } else context.drawImage(image, x, y, width, height);
  }

  // ---- The game loop ----
  const camera = { x: 0, y: 0 };
  game.scenes.add("play", {
    update(game, step) {
      if (world.state !== "playing") {
        if (game.actions.wasPressed("restart") || game.actions.wasPressed("action")) { build(); }
        return;
      }
      world.time += step;
      if (game.actions.wasPressed("restart")) { build(); return; }
      const player = world.player;
      if (player) updatePlayer(world, player, step);
      for (const thing of world.things) {
        if (!thing.alive || thing === player) continue;
        const c = thing.components;
        if (c.dialog || c.player) thing.facing = player && player.x < thing.x ? "left" : "right";
        if (c.patrol) updatePatrol(world, thing, step);
        if (c.chase && player) updateChase(world, thing, step);
        if (c.fly) updateFly(world, thing, step);
        if (c.body && !c.door) updateBody(world, thing, step);
        if (player && thing.alive && overlaps({ x: player.x - 1, y: player.y - 1, width: player.width + 2, height: player.height + 2 }, thing)) touchPlayer(world, thing);
      }
      world.things = world.things.filter((thing) => thing.alive);
      for (const effect of world.effects) effect.age += step;
      world.effects = world.effects.filter((effect) => effect.age < 0.35);
      // Talk: the nearest villager within reach, E to open or close the speech box.
      const near = player && world.things.find((thing) => thing.components.dialog && Math.hypot(thing.x - player.x, thing.y - player.y) < 28);
      if (!near) world.talk = null;
      else if (game.actions.wasPressed("action")) world.talk = world.talk ? null : near.components.dialog.text;
      world.near = near;
      if (player) {
        camera.x = Math.max(0, Math.min(world.width - game.width, player.x + player.width / 2 - game.width / 2));
        camera.y = Math.max(0, Math.min(world.height - game.height, player.y + player.height / 2 - game.height / 2));
        if (world.width < game.width) camera.x = (world.width - game.width) / 2;
        if (world.height < game.height) camera.y = (world.height - game.height) / 2;
      }
    },
    render(game, context) {
      if (backdrop) backdrop.render(context, camera.x, camera.y, world.time);
      context.save();
      context.translate(-Math.round(camera.x), -Math.round(camera.y));
      context.drawImage(picture, 0, 0);
      for (const thing of world.things) if (thing !== world.player) drawThing(context, thing);
      if (world.player) drawThing(context, world.player);
      for (const effect of world.effects) {
        const image = spriteFrames(effect.sprite)[0];
        context.globalAlpha = 1 - effect.age / 0.35;
        context.drawImage(image, Math.round(effect.x - 6), Math.round(effect.y - 6 - effect.age * 30));
        context.globalAlpha = 1;
      }
      if (world.near && !world.talk) drawLabel(context, "E", world.near.x + world.near.width / 2, world.near.y - 12);
      context.restore();
      drawHud(context, game);
    },
  });

  function drawLabel(context, text, x, y) {
    context.font = "8px monospace";
    context.textAlign = "center";
    context.fillStyle = "rgba(10,12,18,0.8)";
    context.fillRect(Math.round(x - 5), Math.round(y - 6), 10, 10);
    context.fillStyle = "#ffd34d";
    context.fillText(text, Math.round(x), Math.round(y + 2));
  }

  function drawHud(context, game) {
    const icons = { heart: spriteFrames("heart")[0], coin: spriteFrames("coin")[0], key: spriteFrames("key")[0] };
    for (let i = 0; i < world.hearts; i++) context.drawImage(icons.heart, 4 + i * 13, 4);
    context.drawImage(icons.coin, 4, 18);
    context.font = "8px monospace";
    context.textAlign = "left";
    context.fillStyle = "#ffffff";
    context.fillText("× " + world.coins, 18, 27);
    if (world.keys) { context.drawImage(icons.key, 48, 18); context.fillText("× " + world.keys, 62, 27); }
    if (world.talk) {
      context.fillStyle = "rgba(10,12,18,0.88)";
      context.fillRect(8, game.height - 44, game.width - 16, 36);
      context.strokeStyle = "#ffd34d";
      context.strokeRect(8.5, game.height - 43.5, game.width - 17, 35);
      context.fillStyle = "#ffffff";
      wrapText(context, world.talk, 14, game.height - 32, game.width - 28);
    }
    if (world.state !== "playing") {
      context.fillStyle = "rgba(10,12,18,0.7)";
      context.fillRect(0, 0, game.width, game.height);
      context.textAlign = "center";
      context.fillStyle = world.state === "won" ? "#ffd34d" : "#ff6b81";
      context.font = "bold 14px monospace";
      context.fillText(world.state === "won" ? world.message : "Game over", game.width / 2, game.height / 2 - 6);
      context.font = "8px monospace";
      context.fillStyle = "#ffffff";
      context.fillText("Coins " + world.coins + " · press R or E to play again", game.width / 2, game.height / 2 + 12);
    }
    if (!world.player) {
      context.textAlign = "center";
      context.fillStyle = "#ffffff";
      context.fillText("Add a Player to the scene to play", game.width / 2, game.height / 2);
    }
  }

  function wrapText(context, text, x, y, maxWidth) {
    let line = "";
    for (const word of text.split(" ")) {
      if (context.measureText(line + word).width > maxWidth) { context.fillText(line, x, y); line = ""; y += 10; }
      line += word + " ";
    }
    context.fillText(line, x, y);
  }

  game.start("play");
  return { game, scene, restart: build, destroy: () => game.destroy(), get world() { return world; } };
}

export { GRAVITY };
