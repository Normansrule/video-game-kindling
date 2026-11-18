# Module: core

**Files:** [`engine/core/`](../../engine/core/) · **Visualizations:** [01 game loop](https://normansrule.github.io/kindling/viz/01-game-loop/), [02 easing](https://normansrule.github.io/kindling/viz/02-easing/) · **Lessons:** [2D-1 The game loop](../../lessons/2d-1-game-loop.html)

The core is the part of the engine that is not about drawing at all: the loop that keeps the game ticking, the clock, scenes, events, tweens, timers, asset loading and saving. Every game uses it, usually through [`createGame`](game.md).

## The idea

A game is a loop: **read input, update the world, draw it, repeat**. The tricky part is time. Screens refresh at 60, 120 or 144 frames per second, and frames are never perfectly even. If your physics moved "a bit each frame", the game would run faster on fast screens.

Kindling uses a **fixed timestep**. The world always updates in equal steps (1/60 of a second by default). Each frame, the real time that passed is added to an **accumulator**, and we run as many whole steps as fit. What is left over becomes **alpha** (0 to 1), which you can use to draw smoothly between the last two steps.

```text
frame arrives, 21 ms passed  ->  accumulator = 21 ms
  step (16.7 ms)             ->  accumulator = 4.3 ms
  not enough for another     ->  draw with alpha = 4.3 / 16.7 = 0.26
```

If the tab freezes for 2 seconds, the loop does not try to run 120 catch-up steps at once (the "spiral of death"). Frame time is clamped to `maxFrameSeconds` (0.25 s).

## Quick example

```js
import { createLoop } from "kindling/core/loop.js";

let x = 0;
const loop = createLoop({
  update(stepSeconds) { x = x + 100 * stepSeconds; },  // 100 pixels per second, on any screen
  render(alpha) { /* draw x */ },
});
loop.start();
```

## API

| File | Function | What it does |
|---|---|---|
| `loop.js` | `createLoop({ update, render, stepSeconds, maxFrameSeconds, time })` | Fixed-timestep loop. Returns `{ start, stop, isRunning, advance(frameSeconds), time, getAccumulator }`. `advance` runs the loop by hand, which is how the tests check it. |
| `time.js` | `createTime(stepSeconds)` | The game clock: `step`, `elapsed` (game seconds), `steps`, `frames`, `fps`, `alpha`, `scale` (0.5 = slow motion). |
| `scene.js` | `createSceneManager(game)` | `add(name, scene)`, `switchTo(name, data)`, `push(name, data)` (pause menus), `pop()`, `currentName()`. A scene is `{ enter, exit, update, render }`, all optional. Only the top scene updates; all scenes in the stack draw. |
| `events.js` | `createEvents()` | A tiny message board: `on(name, fn)`, `once`, `off`, `emit(name, data)`, `clear`. Use it so the score display does not need to know about coins. |
| `canvas.js` | `createCanvas({ canvas, width, height, pixelArt, fit })` | A canvas with a fixed game size (for example 320×180) scaled to fit its box, sharp on high-DPI (dots per inch) screens. `toGamePosition(clientX, clientY)` converts mouse positions. |
| `tween.js` | `createTweens()` / `createTimers()` | `tweens.to(object, { x: 100 }, 0.5, easeOutCubic)` animates numbers; `timers.after(2, fn)` and `timers.every(1, fn)` run code later. Both are updated by the game step, so pausing the game pauses them. |
| `assets.js` | `loadImage`, `loadImages({ name: url })`, `loadJSON`, `loadText` | Promise-based loading. Use `await` at the top of `main.js` (modules allow top-level await). |
| `storage.js` | `createStorage(prefix)` | `save(key, value)`, `load(key, fallback)`, `remove(key)`. Wraps `localStorage` in `try`/`catch`, because private windows can throw. |
| `debug.js` | `createDebugOverlay({ enabled })` | Press the Backquote key (`` ` ``) to toggle. `watch(name, value)` shows a live value, `box(rect)` outlines a hitbox. |
| `version.js` | `KINDLING_VERSION`, `describeEngine()` | The engine version string. |

## Gotchas

- **Update in steps, draw in frames.** Put movement and rules in `update`, never in `render`. `render` may run 0, 1 or many times per step.
- **`stepSeconds` is in seconds**, not milliseconds. Speeds are "per second", so multiply by `stepSeconds`.
- **Modules do not run from `file://`.** Always use a local server; see [RUNNING.md](../RUNNING.md).
- **`await` asset loading before `game.start()`**, or your first frames will draw missing images.

## Go further

- Glenn Fiedler, [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/), the classic article this loop follows.
- Robert Nystrom, [Game Programming Patterns: Game Loop](https://gameprogrammingpatterns.com/game-loop.html) and [Update Method](https://gameprogrammingpatterns.com/update-method.html).
- MDN (Mozilla Developer Network), [`requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame).
