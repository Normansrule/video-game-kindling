# Sample 2D-05: Top-down shooter ("Arena")

**Play:** <https://normansrule.github.io/video-game-kindling/samples/2d/05-top-down-shooter/> · **Run locally:** `cd ~/projects/kindling && python3 -m http.server 8000`, then open <http://localhost:8000/samples/2d/05-top-down-shooter/>

| Controls | |
|---|---|
| Move | WASD or arrows, gamepad left stick, on-screen pad |
| Aim | Mouse, gamepad right stick (phones aim at the nearest enemy) |
| Shoot (hold) | Left mouse button, Space, gamepad right trigger, FIRE button |

## What it teaches

- **Vectors for aiming:** `normalize(subtract(mouse, player))` is "the direction from me to the mouse".
- **Normalized movement:** without `normalize`, moving diagonally is 41% faster.
- **Lists of objects:** bullets and enemies are arrays. Dead ones are removed by `filter` after the loop, never while looping.
- **Fire rate:** a cooldown timer, not "one bullet per frame".
- **Hit feedback:** a white flash, knockback, particles, shake and a sound on every hit, and a blinking invulnerable time after you get hurt.
- **Waves:** when the enemy list is empty, spawn a bigger wave at the edges.

## Try changing

1. Give the player a dash on Shift with a 1-second cooldown.
2. Add an enemy that keeps its distance and shoots back.
3. Drop a health pickup from 1 in 10 enemies.
