# Module: game

**File:** [`engine/game.js`](../../engine/game.js) · **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md) · **Every sample** starts here.

`createGame()` wires the whole engine together, so your game file contains only your game. It is about 120 lines; read it once and you will know how every part connects.

## Quick example

```js
import { createGame } from "kindling/game.js";
import { fillRect } from "kindling/2d/draw.js";

const game = createGame({
  width: 320, height: 180, pixelArt: true,
  actions: { left: ["ArrowLeft", "KeyA"], right: ["ArrowRight", "KeyD"], jump: ["Space", "pad:A"] },
});

const player = { x: 150, y: 120 };
game.scenes.add("play", {
  update(game, stepSeconds) {
    player.x = player.x + game.actions.axis("left", "right") * 90 * stepSeconds;
  },
  render(game, context) {
    fillRect(context, player.x, player.y, 16, 16, "#ffb347");
  },
});
game.start("play");
```

## Options

| Option | Default | Meaning |
|---|---|---|
| `canvas` | `"#game"` | A selector or a canvas element. The page needs `<canvas id="game"></canvas>`. |
| `width`, `height` | 320 × 180 (2D), 640 × 360 (3D) | The game's own resolution. The canvas is scaled to fit its parent. |
| `pixelArt` | `false` | `true` keeps pixels crisp when scaled (no smoothing). |
| `background` | `"#14161b"` | Clear color for 2D. |
| `stepSeconds` | `1 / 60` | Fixed update step. |
| `actions` | `{}` | Named inputs; see [input](input.md). |
| `debug` | `false` | Start with the debug overlay on. |
| `webgl` | `false` | `true` makes a WebGL 2 canvas for 3D: `game.gl` is set and `game.context` is `null`. |
| `clearColor` | dark gray | WebGL clear color as `[r, g, b]` from 0 to 1. |

## What you get back

| Property | What it is |
|---|---|
| `game.context` | The Canvas 2D context (2D games). |
| `game.gl` | The WebGL 2 context (3D games). |
| `game.screen` | The canvas helper (`width`, `height`, `toGamePosition`, `resize`). Pass it to `createRenderer` in 3D. |
| `game.time` | The clock: `elapsed`, `fps`, `alpha`, `scale`. |
| `game.input` | `{ keyboard, mouse, touch, gamepad }`. |
| `game.actions` | Named actions: `isDown`, `wasPressed`, `axis(negative, positive)`. |
| `game.scenes` | The scene manager. |
| `game.events`, `game.tweens`, `game.timers`, `game.debug` | See [core](core.md). |
| `game.state` | An empty object for data that lives across scenes (score, settings). |
| `game.start(sceneName, data)`, `game.stop()` | Start and stop the loop. |
| `game.destroy()` | Stop for good and remove every event listener. Use it when a single-page app (React, Vue...) removes the game; see the [React bridge](../bridges/react.md). |

## One update step, in order

1. Read gamepads.
2. Update tweens and timers.
3. Update the top scene.
4. Clear the "pressed since last step" flags on every device (`endStep`).

Then, once per frame: clear the screen, draw every scene in the stack, draw touch buttons and the debug overlay.

The game also **pauses when the tab is hidden** (the `visibilitychange` event), so nothing happens off-screen and the player does not come back to a lost game.
