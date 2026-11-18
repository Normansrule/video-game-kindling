# Sample 2D-06: Tilemap rooms

**Play:** <https://normansrule.github.io/kindling/samples/2d/06-tilemap-room/> · **Run locally:** `cd ~/projects/kindling && python3 -m http.server 8000`, then open <http://localhost:8000/samples/2d/06-tilemap-room/>

| Controls | |
|---|---|
| Walk | Arrow keys, WASD, gamepad, on-screen pad |
| Read / open / interact | E, Space, Enter, gamepad A, USE button |

## What it teaches

- **One big tilemap, many rooms.** `roomOf()` turns a position into a room with `Math.floor(x / ROOM_WIDTH) * ROOM_WIDTH`.
- **Flip-screen camera.** When the player leaves a room, a tween slides the camera to the next one (`game.tweens.to(camera, ...)`) and the player freezes until it finishes.
- **Interacting with the world:** look at the tile in front of the player and decide what it does (`useThing()`).
- **Changing the map at runtime:** `map.set()` removes the key and opens the door, and collision updates instantly.
- **A word-wrapped text box** in a dozen lines.

## Try changing

1. Add a second key and a second locked area.
2. Make signs show one letter at a time (typewriter effect) using `game.timers.every`.
3. Add an NPC (non-player character) that walks back and forth and talks when you press E.
