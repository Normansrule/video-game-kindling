# Sample 2D-03: Breakout

**Play:** <https://normansrule.github.io/kindling/samples/2d/03-breakout/> · **Run locally:** `cd ~/projects/kindling && python3 -m http.server 8000`, then open <http://localhost:8000/samples/2d/03-breakout/>

| Controls | |
|---|---|
| Move paddle | Mouse, finger, arrow keys, A / D, gamepad |
| Launch / continue | Click, tap, Space, gamepad A |

## What it teaches

- **Circle vs box** with `circleRectPushOut`: push the ball out, then flip the velocity on the axis it was pushed along.
- **Levels as text.** Each digit is a brick with that many hit points; `.` is empty. Designing a level is typing.
- **Mixed input:** keyboard and gamepad through actions, mouse and touch by position.
- **Juice with tweens and timers:** bricks pop in one after another (`game.timers.after` + `game.tweens.to` with `easeOutBack`).
- A reusable **message overlay scene** for "level clear", "game over" and "you win".

## Try changing

1. Add a third level. Try a heart shape.
2. Make bricks with `hits` 3 drop a power-up that widens the paddle for 10 seconds.
3. Speed the ball up a little on every paddle hit, and cap it.
