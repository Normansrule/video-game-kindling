# Sample 3D-05: First-person walk

**Play:** <https://normansrule.github.io/video-game-kindling/samples/3d/05-first-person-walk/> · **Run locally:** `cd ~/projects/kindling && python3 -m http.server 8000`, then open <http://localhost:8000/samples/3d/05-first-person-walk/>

| Controls | |
|---|---|
| Look | click the game, then move the mouse (Escape gives the mouse back), Left / Right arrows, gamepad right stick, touch: drag on the right half |
| Walk | W A S D, Up / Down, gamepad left stick, touch: hold and drag on the left half |

Find the five glowing crystals hidden in the courtyard.

## What it teaches

- **A level from text.** `MAP` is a list of strings; `#` becomes a wall box, `P` a pillar, `C` a crystal, `S` the start. Change the letters to change the level, no editor needed.
- **The first-person camera** (`createFirstPersonCamera`): yaw and pitch from the mouse, `flatForward()` and `right()` for walking, so looking up never makes you fly.
- **Pointer lock:** `mouse.lock()` on a click, `mouse.movement()` each step. The sample ignores one-step spikes, which some browsers send right after locking.
- **Collision with the same boxes you draw**, using `moveAndCollide3D` from `engine/3d/collision3d.js`. Sliding along walls comes for free from moving one axis at a time.
- **Canvas textures and fog:** the bricks and floor tiles are painted with the 2D canvas API at start-up, and `renderer.setFog(22)` fades far walls into the night sky.
- **A light that follows you:** the light sits above the player like a lantern; crystals switch to `ambient: 1` so they look like they glow.

Compare it with [sample 3D-03, the raycaster maze](../03-raycaster-maze/), which fakes the same view with no WebGL at all.

## Try changing

1. Add a door letter `D` that disappears once all crystals are found.
2. Add head bob: move `camera.position.y` by `Math.sin(distanceWalked * 8) * 0.04`.
3. Add a sprint key (Shift) that raises `WALK_SPEED` and widens `camera.fieldOfView` a little.
