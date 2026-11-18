// engine/2d/particles.js
// WHAT: A particle system: lots of tiny short-lived dots for sparks, smoke, dust, blood, magic.
// WHY:  Particles are the cheapest "juice" there is. One burst when an enemy dies
//       makes a game feel ten times better. We reuse dead particles from a fixed pool
//       so there's no garbage to collect mid-game.
// DOC:  docs/modules/particles.md   VIZ: viz/08-particles/

import { lerp } from "../math/scalar.js";

export function createParticles(maxParticles = 500) {
  // The pool: every particle exists from the start; `alive` says if it is in use.
  const pool = [];
  for (let i = 0; i < maxParticles; i++) {
    pool.push({ alive: false, x: 0, y: 0, velocityX: 0, velocityY: 0, age: 0, life: 1,
      sizeStart: 2, sizeEnd: 0, color: "#fff", gravity: 0, drag: 0 });
  }
  let aliveCount = 0;

  // Emit a burst. Every option has a sensible default:
  //   x, y            where (required)
  //   count           how many (10)
  //   angle, spread   direction in radians and how wide the cone is (0, 2*PI = every direction)
  //   speedMin/Max    pixels per second (20..80)
  //   lifeMin/Max     seconds (0.4..0.8)
  //   sizeStart/End   radius in pixels at birth and death (3 -> 0)
  //   colors          array of colors, one picked per particle (["#ffffff"])
  //   gravity         pixels/second² downward (0)
  //   drag            0..1 speed lost per second (0)
  // (a ?? b means "use a, unless a is undefined or null, then use b". Unlike ||, it keeps 0.)
  function emit(options) {
    const count = options.count || 10;
    const spread = options.spread === undefined ? Math.PI * 2 : options.spread;
    const colors = options.colors || ["#ffffff"];
    for (let i = 0; i < count; i++) {
      const particle = pool.find((item) => !item.alive);
      if (!particle) return;   // pool full: skip the rest instead of slowing down
      const angle = (options.angle || 0) + (Math.random() - 0.5) * spread;
      const speed = lerp(options.speedMin ?? 20, options.speedMax ?? 80, Math.random());
      particle.alive = true;
      particle.x = options.x;
      particle.y = options.y;
      particle.velocityX = Math.cos(angle) * speed;
      particle.velocityY = Math.sin(angle) * speed;
      particle.age = 0;
      particle.life = lerp(options.lifeMin ?? 0.4, options.lifeMax ?? 0.8, Math.random());
      particle.sizeStart = options.sizeStart ?? 3;
      particle.sizeEnd = options.sizeEnd ?? 0;
      particle.color = colors[Math.floor(Math.random() * colors.length)];
      particle.gravity = options.gravity || 0;
      particle.drag = options.drag || 0;
      aliveCount = aliveCount + 1;
    }
  }

  function update(stepSeconds) {
    for (const particle of pool) {
      if (!particle.alive) continue;
      particle.age = particle.age + stepSeconds;
      if (particle.age >= particle.life) {
        particle.alive = false;
        aliveCount = aliveCount - 1;
        continue;
      }
      particle.velocityY = particle.velocityY + particle.gravity * stepSeconds;
      const keep = 1 - particle.drag * stepSeconds;
      particle.velocityX = particle.velocityX * keep;
      particle.velocityY = particle.velocityY * keep;
      particle.x = particle.x + particle.velocityX * stepSeconds;
      particle.y = particle.y + particle.velocityY * stepSeconds;
    }
  }

  // Draw every live particle as a square (fast, and looks right in pixel art).
  // Set round = true for soft circles instead.
  function render(context, round = false) {
    for (const particle of pool) {
      if (!particle.alive) continue;
      const progress = particle.age / particle.life;
      const size = lerp(particle.sizeStart, particle.sizeEnd, progress);
      if (size <= 0) continue;
      context.globalAlpha = 1 - progress * progress;   // fade out near the end
      context.fillStyle = particle.color;
      if (round) {
        context.beginPath();
        context.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillRect(particle.x - size, particle.y - size, size * 2, size * 2);
      }
    }
    context.globalAlpha = 1;
  }

  function clear() {
    for (const particle of pool) particle.alive = false;
    aliveCount = 0;
  }

  return { emit, update, render, clear, count: () => aliveCount };
}

// Ready-made looks. Use: particles.emit({ ...presets.explosion, x, y }).
export const presets = {
  explosion: { count: 30, speedMin: 40, speedMax: 140, lifeMin: 0.3, lifeMax: 0.7, sizeStart: 4, sizeEnd: 0, colors: ["#fff3b0", "#ffb347", "#ff6b35", "#d7263d"], drag: 2 },
  sparkle: { count: 12, speedMin: 10, speedMax: 50, lifeMin: 0.4, lifeMax: 0.9, sizeStart: 2, sizeEnd: 0, colors: ["#ffffff", "#fff59d", "#80deea"] },
  dust: { count: 6, angle: -Math.PI / 2, spread: Math.PI / 1.5, speedMin: 10, speedMax: 30, lifeMin: 0.2, lifeMax: 0.4, sizeStart: 2, sizeEnd: 0, colors: ["#c8b89a", "#a89a80"], gravity: 60 },
  smoke: { count: 8, angle: -Math.PI / 2, spread: 0.8, speedMin: 10, speedMax: 30, lifeMin: 0.8, lifeMax: 1.6, sizeStart: 2, sizeEnd: 7, colors: ["#6b6b6b", "#8a8a8a", "#4a4a4a"], drag: 0.5 },
  fire: { count: 4, angle: -Math.PI / 2, spread: 0.6, speedMin: 30, speedMax: 70, lifeMin: 0.3, lifeMax: 0.7, sizeStart: 4, sizeEnd: 0, colors: ["#fff3b0", "#ffb347", "#ff6b35"], gravity: -40 },
  blood: { count: 14, speedMin: 30, speedMax: 110, lifeMin: 0.3, lifeMax: 0.6, sizeStart: 2, sizeEnd: 1, colors: ["#b3261e", "#8c1d18"], gravity: 300 },
};
