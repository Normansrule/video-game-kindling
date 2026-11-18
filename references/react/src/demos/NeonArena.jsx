// references/react/src/demos/NeonArena.jsx   (JavaScript twin: samples/2d/05-top-down-shooter)
// WHAT: The Neon arena game as a React component: a <canvas> for the game, React for the
//       HUD and the start / pause / game-over screens.
// WHY:  Shows where each kind of state belongs:
//         - game state (positions, bullets): a ref, stepped by useFixedStep, never re-renders;
//         - HUD numbers (score, lives): useState, updated only when they change;
//         - screens (start, paused, over): useState, plain React UI.
import { useCallback, useEffect, useRef, useState } from "react";
import { useActions } from "../hooks/useActions.js";
import { useFixedStep } from "../hooks/useFixedStep.js";
import { ARENA_HEIGHT, ARENA_WIDTH, createArena, stepArena } from "../logic/arena.js";

const BINDINGS = {
  left: ["KeyA", "ArrowLeft"], right: ["KeyD", "ArrowRight"],
  up: ["KeyW", "ArrowUp"], down: ["KeyS", "ArrowDown"],
  fire: ["Space"], pause: ["KeyP", "Escape"],
};

export default function NeonArena() {
  const canvasRef = useRef(null);
  const gameRef = useRef(createArena(Date.now() % 100000));
  const pointerRef = useRef({ x: ARENA_WIDTH / 2 + 100, y: ARENA_HEIGHT / 2, down: false, used: false });
  const actions = useActions(BINDINGS);
  const [screen, setScreen] = useState("start");      // "start" | "playing" | "paused" | "over"
  const [hud, setHud] = useState({ score: 0, wave: 0, lives: 3 });

  const update = useCallback((seconds) => {
    const game = gameRef.current;
    if (actions.wasPressed("pause")) setScreen((current) => (current === "playing" ? "paused" : current));
    const pointer = pointerRef.current;
    let aim = pointer;
    if (!pointer.used && game.enemies.length > 0) {
      // No mouse yet (keyboard or touch): aim at the nearest enemy.
      aim = game.enemies.reduce((best, enemy) =>
        Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y) < Math.hypot(best.x - game.player.x, best.y - game.player.y) ? enemy : best);
    }
    stepArena(game, {
      moveX: actions.axis("left", "right"),
      moveY: actions.axis("up", "down"),
      aimX: aim.x, aimY: aim.y,
      firing: pointer.down || actions.isDown("fire"),
    }, seconds);
    actions.endStep();
  }, [actions]);

  const render = useCallback(() => {
    const game = gameRef.current;
    drawArena(canvasRef.current, game);
    // Push HUD numbers into React only when they change: a few renders a minute, not 60 a second.
    setHud((current) => (current.score === game.score && current.wave === game.wave && current.lives === game.lives
      ? current : { score: game.score, wave: game.wave, lives: game.lives }));
    if (game.over) setScreen("over");
  }, []);

  useFixedStep(update, render, { running: screen === "playing" });

  // Draw one frame even while not running, so the start screen has a background.
  useEffect(() => { drawArena(canvasRef.current, gameRef.current); }, [screen]);

  // Pause when the tab is hidden.
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setScreen((s) => (s === "playing" ? "paused" : s)); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  function start() {
    if (screen === "over" || screen === "start") {
      gameRef.current = createArena(Date.now() % 100000);
      setHud({ score: 0, wave: 0, lives: 3 });
    }
    setScreen("playing");
    canvasRef.current.focus();
  }

  function toArena(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * ARENA_WIDTH, y: (event.clientY - rect.top) / rect.height * ARENA_HEIGHT };
  }
  const onPointerMove = (event) => Object.assign(pointerRef.current, toArena(event), { used: event.pointerType === "mouse" || pointerRef.current.used });
  const onPointerDown = (event) => Object.assign(pointerRef.current, toArena(event), { down: true, used: true });
  const onPointerUp = () => { pointerRef.current.down = false; };

  return (
    <>
      <div className="stage">
        <canvas ref={canvasRef} tabIndex={0} aria-label="Neon arena: a glowing ship in a grid arena, fighting waves of shapes."
          onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} />
        <div className="hud" aria-live="polite">
          <span className="score">SCORE {hud.score}</span>
          <span className="lives">{"◆ ".repeat(Math.max(0, hud.lives))}</span>
          <span className="wave">WAVE {hud.wave}</span>
        </div>
        {screen !== "playing" && (
          <div className="overlay">
            <div>
              <h2>{screen === "over" ? "GAME OVER" : screen === "paused" ? "PAUSED" : "NEON ARENA"}</h2>
              {screen === "over" && <p>Score {hud.score}, wave {hud.wave}</p>}
              <p>WASD or arrows move. Aim with the mouse, hold to fire (or Space).</p>
              <button type="button" onClick={start}>{screen === "paused" ? "Resume" : screen === "over" ? "Play again" : "Start"}</button>
            </div>
          </div>
        )}
      </div>
      <p className="help">P or Esc pauses. Game logic: <code>src/logic/arena.js</code>. Drawing: <code>drawArena</code> in this file.</p>
    </>
  );
}

// ---- Drawing: plain Canvas 2D, called once per frame. -------------------------------------

const glowCache = new Map();
// A soft round light, drawn once per color into a small canvas and reused.
function glowSprite(color) {
  if (!glowCache.has(color)) {
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    const context = sprite.getContext("2d");
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.25, color + "aa");
    gradient.addColorStop(1, color + "00");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    glowCache.set(color, sprite);
  }
  return glowCache.get(color);
}

function glow(context, x, y, radius, color, alpha = 1) {
  context.globalAlpha = alpha;
  context.drawImage(glowSprite(color), x - radius, y - radius, radius * 2, radius * 2);
  context.globalAlpha = 1;
}

function drawArena(canvas, game) {
  if (!canvas) return;
  // Match the canvas's real pixel size to its CSS size times the screen density: sharp on phones.
  const ratio = window.devicePixelRatio || 1;
  const width = Math.round(canvas.clientWidth * ratio);
  const height = Math.round(canvas.clientHeight * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  context.setTransform(width / ARENA_WIDTH, 0, 0, height / ARENA_HEIGHT, 0, 0);
  const shake = game.shake * game.shake * 10;
  const offsetX = Math.sin(game.time * 53) * shake;
  const offsetY = Math.sin(game.time * 41 + 1.3) * shake;

  const background = context.createLinearGradient(0, 0, 0, ARENA_HEIGHT);
  background.addColorStop(0, "#08081a");
  background.addColorStop(1, "#1a0a2a");
  context.fillStyle = background;
  context.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
  context.translate(offsetX, offsetY);

  const pulse = 0.5 + 0.5 * Math.sin(game.time * 2);
  context.strokeStyle = `rgba(${70 + pulse * 30}, 60, ${150 + pulse * 40}, 0.35)`;
  context.lineWidth = 1;
  context.beginPath();
  for (let x = 0; x <= ARENA_WIDTH; x += 32) { context.moveTo(x, 0); context.lineTo(x, ARENA_HEIGHT); }
  for (let y = 0; y <= ARENA_HEIGHT; y += 32) { context.moveTo(0, y); context.lineTo(ARENA_WIDTH, y); }
  context.stroke();

  // "lighter" adds colors together: overlapping glows get brighter, like light.
  context.globalCompositeOperation = "lighter";
  for (const enemy of game.enemies) {
    const color = enemy.flash > 0 ? "#ffffff" : enemy.kind === "chaser" ? "#ff46aa" : "#96ff6e";
    glow(context, enemy.x, enemy.y, enemy.radius * 3.2, color, 0.55);
    const sides = enemy.kind === "chaser" ? 3 : 4;
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = enemy.spin + (i * Math.PI * 2) / sides;
      const px = enemy.x + Math.cos(angle) * enemy.radius;
      const py = enemy.y + Math.sin(angle) * enemy.radius;
      if (i === 0) context.moveTo(px, py); else context.lineTo(px, py);
    }
    context.stroke();
  }
  for (const bullet of game.bullets) {
    glow(context, bullet.x, bullet.y, 12, "#ffc850", 0.9);
    context.strokeStyle = "#fff4d0";
    context.beginPath();
    context.moveTo(bullet.x - bullet.vx * 0.02, bullet.y - bullet.vy * 0.02);
    context.lineTo(bullet.x, bullet.y);
    context.stroke();
  }
  for (const particle of game.particles) {
    const left = particle.life / particle.maxLife;
    glow(context, particle.x, particle.y, particle.size * 2.5 * (0.4 + 0.6 * left), particle.color, left);
  }
  const player = game.player;
  const blink = game.invulnerable > 0 && Math.floor(game.time * 20) % 2 === 0;
  if (!game.over && !blink) {
    glow(context, player.x, player.y, 36, "#46dcff", 0.8);
    context.globalCompositeOperation = "source-over";
    context.fillStyle = "#e6fbff";
    context.beginPath();
    context.moveTo(player.x + Math.cos(player.aim) * 14, player.y + Math.sin(player.aim) * 14);
    context.lineTo(player.x + Math.cos(player.aim + 2.5) * 10, player.y + Math.sin(player.aim + 2.5) * 10);
    context.lineTo(player.x + Math.cos(player.aim - 2.5) * 10, player.y + Math.sin(player.aim - 2.5) * 10);
    context.closePath();
    context.fill();
  }
  context.globalCompositeOperation = "source-over";
  context.setTransform(1, 0, 0, 1, 0, 0);
}
