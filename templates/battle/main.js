// templates/battle/main.js
// WHAT: A turn-based battle, like in classic role-playing games. Your hero (from the
//       character designer, if you saved one) fights five monsters in a row. Each
//       turn: Attack, Magic (costs MP), Potion, or Defend. Then the monster acts.
// WHY:  Turn-based games are a STATE MACHINE: "choose" -> "hero acts" -> "monster
//       acts" -> "choose" again, with a short wait between so you can read what
//       happened. `state` names the step we are in; update() only does that step.
// GROW IT: more actions in ACTIONS, monster special moves, a party of three heroes,
//       items found after battles, or a map between fights (see templates/topdown).

import { createGame } from "kindling/game.js";
import { createBackdrop } from "kindling/2d/backdrop.js";
import { text, fillRect, strokeRect } from "kindling/2d/draw.js";
import { createParticles, presets } from "kindling/2d/particles.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { createRandom } from "kindling/math/random.js";
import { tileCanvas } from "kindling/library/tiles.js";
import { spriteCanvas } from "kindling/library/sprites.js";
import { characterSheet } from "kindling/characters/character-sprite.js";
import { normalizeCharacter } from "kindling/characters/character-spec.js";

const WIDTH = 320, HEIGHT = 180;
const MONSTERS = [
  { name: "Slime", sprite: "slime", health: 18, attack: [2, 4] },
  { name: "Giant bat", sprite: "bat", health: 24, attack: [3, 5] },
  { name: "Spider", sprite: "spider", health: 32, attack: [3, 7] },
  { name: "Skeleton", sprite: "skeleton", health: 44, attack: [4, 8] },
  { name: "Ghost king", sprite: "ghost", health: 70, attack: [5, 10] },
];
const ACTIONS = ["Attack", "Magic (5 MP)", "Potion", "Defend"];

const game = createGame({
  width: WIDTH, height: HEIGHT, pixelArt: true, background: "#202233",
  actions: { up: ["ArrowUp", "KeyW", "pad:Up"], down: ["ArrowDown", "KeyS", "pad:Down"], choose: ["Enter", "Space", "KeyE", "pad:A"] },
});
const mouse = game.input.mouse;
const random = createRandom();
const audio = createAudio();
const particles = createParticles(300);
const backdrop = createBackdrop({ width: WIDTH, height: HEIGHT, theme: "dusk" });
function savedLook() {
  try { return normalizeCharacter((JSON.parse(localStorage.getItem("kindling:characters")) || [])[0]); } catch { return normalizeCharacter({}); }
}
const look = savedLook();
const sheet = characterSheet(look, 3);
const ground = tileCanvas("grass_block");

let hero, monster, round, choice, state, wait, message, floaters, shake, time;
function reset() {
  hero = { name: look.name || "Hero", health: 40, maxHealth: 40, magic: 15, maxMagic: 15, potions: 3, defending: false, level: 1 };
  round = 0;
  floaters = [];
  time = 0;
  nextMonster();
}
function nextMonster() {
  const type = MONSTERS[round];
  monster = { ...type, maxHealth: type.health, picture: spriteCanvas(type.sprite, 5) };
  choice = 0;
  say("A " + type.name.toLowerCase() + " appears!", "choose", 0.8);
}
// Show a message, then move on to the next state after `seconds`.
function say(text, next, seconds = 1) { message = text; state = "wait"; wait = { next, seconds }; }
const hit = (target, amount, color) => {
  floaters.push({ text: String(amount), x: target === hero ? 70 : 230, y: 70, age: 0, color });
  if (target === monster) shake = 0.25;
  particles.emit({ ...presets.explosion, count: 12, x: target === hero ? 70 : 230, y: 92 });
};

function heroActs(action) {
  hero.defending = false;
  if (action === 0) {
    const damage = random.int(4, 7) + hero.level;
    const critical = random.chance(0.15);
    monster.health -= critical ? damage * 2 : damage;
    hit(monster, critical ? damage * 2 : damage, critical ? "#ffd34d" : "#ffffff");
    playSfx(audio, "hit");
    say(critical ? "A critical hit!" : hero.name + " attacks!", "afterHero");
  } else if (action === 1) {
    if (hero.magic < 5) { say("Not enough magic.", "choose", 0.7); return; }
    hero.magic -= 5;
    const damage = random.int(10, 14) + hero.level * 2;
    monster.health -= damage;
    hit(monster, damage, "#b39dff");
    playSfx(audio, "laser");
    say(hero.name + " casts a fireball!", "afterHero");
  } else if (action === 2) {
    if (!hero.potions) { say("No potions left.", "choose", 0.7); return; }
    hero.potions--;
    const healed = Math.min(20, hero.maxHealth - hero.health);
    hero.health += healed;
    floaters.push({ text: "+" + healed, x: 70, y: 70, age: 0, color: "#7bd389" });
    playSfx(audio, "powerup");
    say(hero.name + " drinks a potion.", "afterHero");
  } else {
    hero.defending = true;
    playSfx(audio, "select");
    say(hero.name + " raises a shield.", "afterHero", 0.7);
  }
}

function monsterActs() {
  const [low, high] = monster.attack;
  let damage = random.int(low, high);
  if (hero.defending) damage = Math.ceil(damage / 3);
  hero.health = Math.max(0, hero.health - damage);
  hit(hero, damage, "#ff6b81");
  playSfx(audio, "hit");
  say("The " + monster.name.toLowerCase() + " attacks!" + (hero.defending ? " Blocked most of it." : ""), hero.health <= 0 ? "lost" : "choose");
}

function update(game, step) {
  time += step;
  particles.update(step);
  shake = Math.max(0, (shake || 0) - step);
  for (const floater of floaters) { floater.age += step; floater.y -= step * 20; }
  floaters = floaters.filter((floater) => floater.age < 1);
  if (state === "wait") {
    wait.seconds -= step;
    if (wait.seconds > 0) return;
    if (wait.next === "afterHero") {
      if (monster.health > 0) { monsterActs(); return; }
      round++;
      playSfx(audio, "coin");
      if (round >= MONSTERS.length) { say("You defeated every monster!", "won", 0.5); return; }
      hero.level++; hero.maxHealth += 6; hero.health = Math.min(hero.maxHealth, hero.health + 12); hero.magic = hero.maxMagic;
      say("Victory! Level " + hero.level + ". Health and magic restored a bit.", "next", 1.6);
      return;
    }
    if (wait.next === "next") { nextMonster(); return; }
    state = wait.next;
    if (state === "choose") message = "What will " + hero.name + " do?";
    return;
  }
  if (state === "won" || state === "lost") { if (game.actions.wasPressed("choose") || mouse.wasPressed(0)) reset(); return; }
  if (state !== "choose") return;
  if (game.actions.wasPressed("up")) { choice = (choice + ACTIONS.length - 1) % ACTIONS.length; playSfx(audio, "select", 0.2); }
  if (game.actions.wasPressed("down")) { choice = (choice + 1) % ACTIONS.length; playSfx(audio, "select", 0.2); }
  // Mouse and touch: hovering a menu row picks it, clicking acts.
  const row = Math.floor((mouse.position.y - 126) / 12);
  if (mouse.position.x > 200 && row >= 0 && row < ACTIONS.length) { if (mouse.wasPressed(0)) { choice = row; heroActs(choice); return; } }
  if (game.actions.wasPressed("choose")) heroActs(choice);
}

function bar(context, x, y, width, value, max, color) {
  fillRect(context, x, y, width, 4, "#11131a");
  fillRect(context, x, y, Math.round((width * Math.max(0, value)) / max), 4, color);
}

// Draw a message over several lines so it fits in the box.
function wrapText(context, message, x, y, width) {
  context.font = "8px monospace";
  let line = "";
  for (const word of message.split(" ")) {
    if (line && context.measureText(line + word).width > width) { text(context, line, x, y, { color: "#e9edf4" }); line = ""; y += 11; }
    line += word + " ";
  }
  text(context, line, x, y, { color: "#e9edf4" });
}

function render(game, context) {
  backdrop.render(context, time * 4, 0, time);
  for (let x = 0; x < WIDTH; x += 16) context.drawImage(ground, x, 108);
  // The hero: a big idle frame facing right, bobbing gently.
  const frame = sheet.frames.idleRight[0];
  const bob = Math.round(Math.sin(time * 3) * 1.5);
  if (state !== "lost") context.drawImage(sheet.canvas, frame.x, frame.y, frame.width, frame.height, 48, 108 - frame.height + bob, frame.width, frame.height);
  if (monster.health > 0 || state === "wait") {
    const offset = shake > 0 ? Math.round(Math.sin(shake * 80) * 3) : 0;
    context.globalAlpha = monster.health > 0 ? 1 : 0.3;
    context.drawImage(monster.picture, 230 - monster.picture.width / 2 + offset, 108 - monster.picture.height + Math.round(Math.sin(time * 2) * 2));
    context.globalAlpha = 1;
  }
  particles.render(context);
  for (const floater of floaters) text(context, floater.text, floater.x, floater.y, { align: "center", bold: true, size: 12, color: floater.color });

  // Status boxes at the top.
  fillRect(context, 6, 6, 120, 30, "rgba(16,19,26,0.85)");
  text(context, hero.name + "  Lv " + hero.level, 10, 9, { color: "#ffffff" });
  bar(context, 10, 21, 70, hero.health, hero.maxHealth, "#7bd389");
  text(context, hero.health + "/" + hero.maxHealth, 84, 19, { color: "#7bd389" });
  bar(context, 10, 28, 70, hero.magic, hero.maxMagic, "#5ac8fa");
  text(context, "MP " + hero.magic, 84, 26, { color: "#5ac8fa" });
  fillRect(context, 194, 6, 120, 22, "rgba(16,19,26,0.85)");
  text(context, monster.name, 198, 9, { color: "#ffffff" });
  bar(context, 198, 20, 112, monster.health, monster.maxHealth, "#ff6b81");

  // Message box and menu at the bottom.
  fillRect(context, 0, 124, WIDTH, 56, "#10131a");
  strokeRect(context, 4.5, 126.5, 190, 50, "#3a4256");
  strokeRect(context, 200.5, 126.5, 115, 50, "#3a4256");
  wrapText(context, message, 10, 132, 180);
  if (state === "won") text(context, "Press Enter or click to play again", 10, 160, { color: "#ffd34d" });
  if (state === "lost") text(context, "You fainted! Enter or click to retry", 10, 160, { color: "#ff6b81" });
  ACTIONS.forEach((name, index) => {
    const label = index === 2 ? "Potion x" + hero.potions : name;
    const active = state === "choose" && index === choice;
    text(context, (active ? "▶ " : "  ") + label, 206, 129 + index * 12, { color: state === "choose" ? (active ? "#ffd34d" : "#e9edf4") : "#5a6275" });
  });
}

reset();
game.scenes.add("play", { update, render });
game.start("play");
