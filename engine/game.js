// engine/game.js
// WHAT: createGame() wires the engine together: canvas, loop, time, input, scenes,
//       events, tweens, timers and the debug overlay. Most games start here.
// WHY:  Every game needs the same 40 lines of setup. Writing them once, clearly,
//       means your game file only has game code in it.
// DOC:  docs/modules/game.md   ARCHITECTURE: docs/ARCHITECTURE.md
//
// Usage:
//   import { createGame } from "kindling/game.js";
//   const game = createGame({ width: 320, height: 180, actions: { jump: ["Space"] } });
//   game.scenes.add("play", { update(game, dt) {...}, render(game, context) {...} });
//   game.start("play");

import { createCanvas } from "./core/canvas.js";
import { createGL } from "./3d/gl.js";
import { createLoop } from "./core/loop.js";
import { createTime } from "./core/time.js";
import { createSceneManager } from "./core/scene.js";
import { createEvents } from "./core/events.js";
import { createDebugOverlay } from "./core/debug.js";
import { createTweens, createTimers } from "./core/tween.js";
import { createKeyboard } from "./input/keyboard.js";
import { createMouse } from "./input/mouse.js";
import { createTouch } from "./input/touch.js";
import { createGamepad } from "./input/gamepad.js";
import { createActions } from "./input/actions.js";

// options: canvas, width, height, pixelArt, background, stepSeconds, actions, debug
//          webgl: true  -> a WebGL 2 canvas for 3D (game.gl) instead of Canvas 2D (game.context)
export function createGame(options = {}) {
  const webgl = options.webgl === true;
  let screen;
  if (webgl) {
    screen = createGL({ canvas: options.canvas, width: options.width, height: options.height, fit: options.fit, clearColor: options.clearColor });
  } else {
    screen = createCanvas({
      canvas: options.canvas,
      width: options.width,
      height: options.height,
      pixelArt: options.pixelArt,
      fit: options.fit,
    });
  }
  const time = createTime(options.stepSeconds || 1 / 60);

  const keyboard = createKeyboard();
  const mouse = createMouse(screen);
  const touch = createTouch(screen);
  const gamepad = createGamepad();
  const input = { keyboard, mouse, touch, gamepad };

  const game = {
    screen,
    canvas: screen.canvas,
    context: webgl ? null : screen.context,   // Canvas 2D drawing (2D games)
    gl: webgl ? screen.gl : null,             // WebGL 2 (3D games)
    width: screen.width,
    height: screen.height,
    background: options.background || "#14161b",
    time,
    input,
    actions: createActions(options.actions || {}, input),
    events: createEvents(),
    tweens: createTweens(),
    timers: createTimers(),
    debug: createDebugOverlay({ enabled: options.debug === true }),
    // A place for anything that should survive scene changes (score, settings...).
    state: {},
  };
  game.scenes = createSceneManager(game);

  // One fixed update step: read input, update the scene, then clear "pressed" flags.
  function update(stepSeconds) {
    gamepad.update();
    game.tweens.update(stepSeconds);
    game.timers.update(stepSeconds);
    game.scenes.update(stepSeconds);
    keyboard.endStep();
    mouse.endStep();
    touch.endStep();
    game.actions.endStep();
  }

  // Draw: clear, let the scenes draw, then touch buttons and the debug overlay on top.
  // (In WebGL mode the renderer clears, and HUDs are usually HTML on top of the canvas.)
  function render(alpha) {
    if (webgl) {
      game.scenes.render(null, alpha);
      return;
    }
    screen.clear(game.background);
    game.scenes.render(game.context, alpha);
    touch.render(game.context);
    game.debug.render(game.context, time);
  }

  const loop = createLoop({ update, render, time });
  game.loop = loop;

  // Start the loop on a scene. data is passed to that scene's enter().
  let wantsToRun = false;
  game.start = function start(sceneName, data) {
    if (sceneName) game.scenes.switchTo(sceneName, data);
    game.canvas.focus();
    wantsToRun = true;
    loop.start();
  };

  game.stop = function stop() {
    wantsToRun = false;
    loop.stop();
  };

  // Pause the whole game when the tab is hidden, so nothing happens off-screen.
  function onVisibilityChange() {
    if (document.hidden) loop.stop();
    else if (wantsToRun) loop.start();
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  // Remove the game from the page for good: stop the loop and every event listener.
  // Single-page apps need this (a React component unmounting, a level editor closing).
  game.destroy = function destroy() {
    game.stop();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    keyboard.destroy();
    mouse.destroy();
    touch.destroy();
    game.debug.destroy();
    screen.destroy();
  };

  return game;
}
