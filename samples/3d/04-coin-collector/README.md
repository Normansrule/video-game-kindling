# Sample 3D-04: Coin collector

**Play:** <https://normansrule.github.io/kindling/samples/3d/04-coin-collector/> · **Run locally:** `cd ~/projects/kindling && python3 -m http.server 8000`, then open <http://localhost:8000/samples/3d/04-coin-collector/>

| Controls | |
|---|---|
| Run | W A S D or arrows, gamepad left stick, touch: hold and drag on the left half |
| Jump | Space, gamepad A, touch: tap the right half |
| Turn the camera | Q / E, drag with the mouse, gamepad right stick |
| Play again | R or Enter |

Collect all 10 coins in 90 seconds. Fall off and you go back to the start island.

## What it teaches

- **AABB (axis-aligned bounding box) collision in 3D** with `engine/3d/collision3d.js`: `moveAndCollide3D` moves x, then y, then z, and pushes back out of any platform. It is `engine/2d/physics.js` with one more axis.
- **One list of boxes for drawing AND collision.** Each platform is drawn as the unit cube scaled to the box's size, so what you see is exactly what you stand on.
- **Camera-relative movement:** pressing W moves *away from the camera*, using the camera's yaw to build `forward` and `right` vectors.
- **A follow camera:** the orbit camera's target eases toward the player with `damp`, which feels smooth at any frame rate.
- **Blob shadow:** `rayBox` casts a ray straight down to find the platform below, and a flat dark disc is drawn there. Players judge jumps by it.

## Try changing

1. `JUMP_SPEED = 12` and move the platforms further apart.
2. Add a moving platform: change one box's `x` with `Math.sin(game.time.elapsed)` each step, and carry the player when `player.onGround` is on it.
3. Add a double jump: count jumps, reset when `player.onGround`.
