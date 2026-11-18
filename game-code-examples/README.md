# Game Code Examples

35 small, runnable programs: every kind of code you need to start a game, from the first canvas to a lit 3D block world. Each one is a single file in [`code/`](code/) that imports only from the Kindling engine.

**Browse them:** [gallery](https://normansrule.github.io/video-game-kindling/game-code-examples/) · **Edit them live:** [playground](https://normansrule.github.io/video-game-kindling/playground/)

## How to use them

- **In the browser.** Open the gallery, click a card, and the example opens in the playground. Change the code; it reruns as you type (or press Ctrl + Enter). Your edits are saved in your browser until you press Reset.
- **On your computer.** Start a server in the repo, then open `frame.html?ex=NAME`:

  ```bash
  cd ~/projects/kindling && python3 -m http.server 8000
  # http://localhost:8000/game-code-examples/frame.html?ex=11-platformer-physics
  ```

- **In your game.** Copy the file into your game folder (for example a copy of `jam/starter/`) and import it from your page. Every example starts with a comment block: WHAT it does, WHY it works that way, and TRY, small changes to make.

## The list

### Start here

Canvas, the game loop, input and scenes. The skeleton of every game.

| # | Example | What it shows |
|---|---|---|
| 01 | [Hello canvas](code/01-hello-canvas.js) | Make a game, add a scene, draw shapes and text. |
| 02 | [Game loop and delta time](code/02-game-loop.js) | A bouncing ball that moves in pixels per second. |
| 03 | [Keyboard movement](code/03-keyboard-movement.js) | Named actions, acceleration and friction. |
| 04 | [Mouse and touch](code/04-mouse-and-touch.js) | Follow the pointer, click or tap to plant flowers. |
| 05 | [Gamepad](code/05-gamepad.js) | Both sticks and every button, live. |
| 06 | [Scenes and menus](code/06-scenes-and-menus.js) | Title, play, pause and game over screens. |
| 07 | [Timers and tweens](code/07-timers-and-tweens.js) | Do things later, animate any number with easing. |

### Gameplay

Movement, collision, physics, cameras, enemies, pathfinding and procedural maps.

| # | Example | What it shows |
|---|---|---|
| 08 | [Sprites and animation](code/08-sprites-and-animation.js) | A walking sprite sheet painted from text, played by an animator. |
| 09 | [Box collision (AABB)](code/09-collision-boxes.js) | Overlap tests and pushing out of walls. |
| 10 | [Circles and rotated shapes (SAT)](code/10-collision-circles-and-sat.js) | Separating Axis Theorem on a spinning box. |
| 11 | [Platformer physics](code/11-platformer-physics.js) | Gravity, jumping, coyote time and a text tilemap. |
| 12 | [Top-down tilemap](code/12-top-down-tilemap.js) | RPG-style movement with solid walls, trees and water. |
| 13 | [Camera follow, zoom and shake](code/13-camera-follow-and-shake.js) | A smooth camera in a world bigger than the screen. |
| 14 | [Particles and juice](code/14-particles-and-juice.js) | Explosions, screen shake, flash and hit stop. |
| 15 | [Enemy AI state machine](code/15-enemy-ai-state-machine.js) | Patrol, chase and return, one function per state. |
| 16 | [Pathfinding with A*](code/16-pathfinding-a-star.js) | Shortest path around walls, with the search shown. |
| 17 | [Procedural map from noise](code/17-procedural-noise-map.js) | Seeded islands from fractal noise. |
| 18 | [Object pool for bullets](code/18-object-pool-bullets.js) | Reuse objects instead of making garbage. |
| 19 | [Enemy waves](code/19-spawning-waves.js) | A wave table and a director that paces the action. |

### Sound, saving and UI

Sound effects, music, save files, HUDs, dialogue and inventories.

| # | Example | What it shows |
|---|---|---|
| 20 | [Sound effects from code](code/20-sound-effects.js) | Every built-in sound, plus a custom sweep. |
| 21 | [Music sequencer](code/21-music-sequencer.js) | A looping tune with a lookahead scheduler. Click to edit notes. |
| 22 | [Save and load](code/22-save-and-load.js) | High scores and settings that survive a reload. |
| 23 | [HUD and buttons](code/23-ui-hud-and-buttons.js) | Health bar, counters and buttons with hover and press. |
| 24 | [Dialogue with choices](code/24-dialogue-box.js) | Typewriter text and branching choices from data. |
| 25 | [Inventory grid](code/25-inventory-grid.js) | Pick up, drop, stack and swap items. |

### 2.5D views

Isometric dioramas, raycasters, and switching one game between 2D, 2.5D and 3D.

| # | Example | What it shows |
|---|---|---|
| 26 | [Isometric world](code/26-isometric-world.js) | A block diorama; walk and place blocks. |
| 27 | [Raycaster first person](code/27-raycaster-first-person.js) | A textured maze with fog and coin sprites. |
| 28 | [Switch 2D, 2.5D and 3D](code/28-switch-2d-25d-3d.js) | One island, five views, keys 1 to 5. |

### 3D

WebGL 2 from a single cube to a lit voxel world, models, first-person controls and shaders.

| # | Example | What it shows |
|---|---|---|
| 29 | [3D hello cube](code/29-3d-hello-cube.js) | A lit, spinning cube and an orbit camera. |
| 30 | [3D block world](code/30-3d-voxel-world.js) | Shadows, ambient occlusion, fog, sky and sea. |
| 31 | [Low-poly models](code/31-3d-low-poly-models.js) | Trees, rocks, a bench and an animated character, all from code. |
| 32 | [First-person controls](code/32-3d-first-person-controls.js) | Pointer lock mouse look, walking and jumping. |
| 33 | [Day and night](code/33-3d-day-night-cycle.js) | Sunsets, stars and lanterns that light up. |
| 34 | [Break and place blocks](code/34-3d-break-and-place-blocks.js) | Mouse picking with a ray through the block grid. |
| 35 | [Write your own shader](code/35-shader-playground.js) | A full-screen GLSL shader you can edit live. |

## Add your own

1. Write `code/NN-short-name.js`. Import the engine as `kindling/...` (the import map points it at `../engine/`). Use a `<canvas id="game">`, or let `createGame()` make one.
2. Add one line to [`catalog.js`](catalog.js) with its id, title, category, tags and summary.
3. Make a thumbnail: a 480 × 300 JPEG in `thumbs/` with the same name.
4. Run the smoke test (`node tools/smoke/smoke.mjs`), which opens every example and fails on any console error.
