# Sample 2D-01: Pong

**Play:** <https://normansrule.github.io/video-game-kindling/samples/2d/01-pong/> · **Run locally:** `cd ~/projects/kindling && python3 -m http.server 8000`, then open <http://localhost:8000/samples/2d/01-pong/>

| Controls | |
|---|---|
| Move | W / S, arrow keys, gamepad stick or d-pad, or touch the left edge |
| Start | Space, Enter, click, tap, gamepad A |
| Debug overlay | ` (backquote) |

## What it teaches

- `createGame` with three scenes: `title`, `play`, and `gameOver` pushed **on top** of play so the last frame stays visible.
- Actions: one name (`up`) bound to keys, gamepad and a touch button.
- AABB (Axis-Aligned Bounding Box) collision with `rectsOverlap`.
- The **angle-from-hit-position** rule in `bounceOffPaddle()`: it is what makes Pong a game of skill.
- Juice: screen shake (`camera.shake`), particles, and sounds made from code (`playSfx`).

Engine modules used: `game.js`, `2d/collision.js`, `2d/draw.js`, `2d/particles.js`, `2d/camera.js`, `audio/audio.js`, `audio/sfx.js`, `math/scalar.js`, `math/random.js`.

## Try changing

1. `COMPUTER_SPEED = 200`: now it never misses. What is the lowest number that still feels fair?
2. `MAX_BOUNCE_ANGLE = 0`: the ball always goes straight. Why does the game die?
3. Add a second ball after 3 points. (Hint: turn `ball` into an array and loop over it.)
4. Make it two-player: bind the right paddle to `ArrowUp`/`ArrowDown` and the left one to W/S only.
