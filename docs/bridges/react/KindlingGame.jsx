// docs/bridges/react/KindlingGame.jsx
// WHAT: A React component that hosts a Kindling game: React owns the page (menus, score,
//       buttons); Kindling owns the canvas and runs its own 60-steps-per-second loop.
// WHY:  React re-renders when state changes. A game changes 60 times a second, so game
//       state must NOT live in React state. Keep it in plain objects inside the game, and
//       tell React only about the few things the page shows (score, game over).
// USE:  Copy this file and the engine/ folder into your React app, and map "kindling/"
//       to the engine (see docs/bridges/react.md). Works in StrictMode.
// DOC:  docs/bridges/react.md

import { useEffect, useRef, useState } from "react";
import { createGame } from "kindling/game.js";
import { fillRect, fillCircle, text } from "kindling/2d/draw.js";
import { rectsOverlap } from "kindling/2d/collision.js";

// The game itself: a plain function, no React inside. Catch the falling stars.
function startCatchGame(canvas) {
  const game = createGame({
    canvas,
    width: 320,
    height: 180,
    actions: { left: ["ArrowLeft", "KeyA", "pad:Left"], right: ["ArrowRight", "KeyD", "pad:Right"] },
  });
  const basket = { x: 144, y: 160, width: 32, height: 8 };
  const stars = [];
  let score = 0;
  let spawnSeconds = 0;

  game.scenes.add("play", {
    update(game, stepSeconds) {
      basket.x += game.actions.axis("left", "right") * 160 * stepSeconds;
      basket.x = Math.max(0, Math.min(320 - basket.width, basket.x));
      spawnSeconds -= stepSeconds;
      if (spawnSeconds <= 0) {
        stars.push({ x: 8 + Math.random() * 300, y: -8, width: 6, height: 6 });
        spawnSeconds = 0.8;
      }
      for (const star of stars) star.y += 70 * stepSeconds;
      for (let i = stars.length - 1; i >= 0; i--) {
        if (rectsOverlap(stars[i], basket)) {
          stars.splice(i, 1);
          score += 1;
          game.events.emit("score", score);   // the ONLY thing React hears about
        } else if (stars[i].y > 180) {
          stars.splice(i, 1);
        }
      }
    },
    render(game, context) {
      for (const star of stars) fillCircle(context, star.x + 3, star.y + 3, 3, "#ffe08a");
      fillRect(context, basket.x, basket.y, basket.width, basket.height, "#ffb347");
      text(context, "← → to move", 4, 4, { size: 8, color: "#8a8f9c" });
    },
  });
  game.start("play");
  return game;
}

export function KindlingGame() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);         // a ref, not state: changing it must not re-render
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);

  // Create the game once when the component appears; destroy it when it goes away.
  // In development, StrictMode runs this twice (mount, unmount, mount). destroy() makes
  // that safe: the first game stops and removes all its listeners.
  useEffect(() => {
    const game = startCatchGame(canvasRef.current);
    gameRef.current = game;
    game.events.on("score", setScore);  // event -> React state, a few times a minute
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  function togglePause() {
    const game = gameRef.current;
    if (!game) return;
    if (paused) game.start();   // no scene name: carry on where it was
    else game.stop();
    setPaused(!paused);
  }

  return (
    <section style={{ maxWidth: 640 }}>
      <p>
        Stars caught: <strong data-testid="score">{score}</strong>{" "}
        <button type="button" onClick={togglePause}>{paused ? "Resume" : "Pause"}</button>
      </p>
      <div style={{ width: "100%", aspectRatio: "16 / 9" }}>
        <canvas ref={canvasRef} tabIndex={0} aria-label="Catch the falling stars with the basket." />
      </div>
    </section>
  );
}
