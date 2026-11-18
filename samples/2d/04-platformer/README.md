# Sample 2D-04: Platformer

**Play:** <https://normansrule.github.io/video-game-kindling/samples/2d/04-platformer/> · **Run locally:** `cd ~/projects/kindling && python3 -m http.server 8000`, then open <http://localhost:8000/samples/2d/04-platformer/>

| Controls | |
|---|---|
| Run | Arrow keys, A / D, gamepad, on-screen buttons |
| Jump (hold for higher) | Space, Up, W, Z, gamepad A |

## What it teaches

- **Tilemap levels as text** (`level.js`) with solid ground, bricks, one-way platforms (`=`) and spikes (`^`).
- **Physics against a tilemap:** `moveAndCollide(player, step, map)` because a tilemap has `solidsNear()`.
- **Game feel, the invisible three:**
  - *Coyote time* (`COYOTE_SECONDS`): you can jump a moment after running off a ledge.
  - *Jump buffering* (`JUMP_BUFFER_SECONDS`): pressing jump just before landing still jumps.
  - *Variable jump height* (`JUMP_CUT`): tap for a hop, hold for a big jump.
- **Animation state from physics:** in the air going up = `jump`, down = `fall`, moving = `run`, else `idle`.
- **Stomping enemies:** an overlap counts as a stomp only if you are falling and your feet are near its top.
- **Camera** with a dead zone, clamped to the level.

Art: `hero.png` and `tiles.png` are CC0, made for Kindling (copied here so this folder works on its own).

## Try changing

1. Set `COYOTE_SECONDS = 0` and `JUMP_BUFFER_SECONDS = 0`, play for a minute, then put them back. Feel the difference?
2. Add a double jump: allow one extra jump in the air, reset when `player.onGround`.
3. Design a third level in `level.js`. Keep the rows the same length.
4. Add a checkpoint flag that changes where `hurtPlayer()` restarts you.
