# Sample 2D-02: Snake

**Play:** <https://normansrule.github.io/video-game-kindling/samples/2d/02-snake/> · **Run locally:** `cd ~/projects/kindling && python3 -m http.server 8000`, then open <http://localhost:8000/samples/2d/02-snake/>

| Controls | |
|---|---|
| Turn | Arrow keys, WASD, gamepad, or the on-screen pad (phones) |
| Start | Space, Enter, tap, gamepad A |

## What it teaches

- **Grid movement in ticks.** The engine updates 60 times a second, but the snake moves one cell every `secondsPerMove`. A time counter (`timeSinceMove`) decides when.
- **Input buffering.** `turnQueue` keeps quick presses (up then left inside one tick) so none are lost, and rejects turning straight back.
- **The body is an array.** Add a new head with `unshift`, drop the tail with `pop`. Growing just skips the `pop`.
- **High scores** with `createStorage`, which never crashes if the browser blocks storage.
- Pixel-art mode: `pixelArt: true` gives sharp, square pixels at any size.

Engine modules used: `game.js`, `2d/draw.js`, `2d/particles.js`, `audio/*`, `core/storage.js`, `math/random.js`.

## Try changing

1. Let the snake wrap around the edges instead of dying. (Hint: `next.column = (next.column + COLUMNS) % COLUMNS`.)
2. Add golden food worth 5 points that disappears after 3 seconds.
3. Add a second snake for a second player on WASD (move the first to arrows only).
