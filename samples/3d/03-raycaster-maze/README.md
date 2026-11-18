# Sample 3D-03: Raycaster maze

**Play:** <https://normansrule.github.io/kindling/samples/3d/03-raycaster-maze/> · **Run locally:** `cd ~/projects/kindling && python3 -m http.server 8000`, then open <http://localhost:8000/samples/3d/03-raycaster-maze/>

| Controls | |
|---|---|
| Walk / back | W / S, Up / Down, gamepad |
| Step sideways | A / D, gamepad left stick |
| Turn | Left / Right arrows, the mouse (click first to lock it; Escape unlocks), gamepad right stick |
| Map | M, gamepad Y |

## What it teaches

- **Raycasting** (`castRays` + `drawRaycastView`): 160 rays, 160 wall stripes, height = 1 / distance. No WebGL.
- **Maze generation** with a recursive backtracker in `generateMaze()`: a random walk that knocks down walls and backs up at dead ends. Every run is a new maze.
- **First-person movement on a grid:** forward is `(cos angle, sin angle)`, sideways is that turned 90 degrees, and `moveInGrid` slides you along walls.
- **Pointer lock** for mouse look: `game.input.mouse.lock()` on a click, `mouse.movement()` each step.

See it explained: [viz 11, the raycaster](https://normansrule.github.io/kindling/viz/11-raycaster/).

## Try changing

1. `MAZE_CELLS = 12` for a big maze. Add a time limit.
2. Give walls different colors by type: put `1`, `2` in the grid and add them to `WALL_COLORS`.
3. Add a key you must find before the exit opens (draw it on the map, check distance to pick it up).
