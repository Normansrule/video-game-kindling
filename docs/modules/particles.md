# Module: particles

**File:** [`engine/2d/particles.js`](../../engine/2d/particles.js) · **Visualization:** [08 particles](https://normansrule.github.io/video-game-kindling/viz/08-particles/) · **Lesson:** [2D-6 Juice](../../lessons/2d-6-juice.html)

Lots of tiny, short-lived dots: sparks, smoke, dust, blood, magic. Particles are the cheapest "juice" there is. One burst when an enemy dies makes a game feel far more alive.

```js
import { createParticles, presets } from "kindling/2d/particles.js";

const particles = createParticles(500);       // at most 500 alive at once

// when something happens:
particles.emit({ ...presets.explosion, x: enemy.x, y: enemy.y });
particles.emit({ ...presets.dust, x: player.x + 6, y: player.y + 14, count: 3 });

// every step, and every frame:
particles.update(stepSeconds);
particles.render(context, true);              // true = round to whole pixels (pixel art)
```

## emit options

| Option | Default | Meaning |
|---|---|---|
| `x`, `y` | required | Where they start. |
| `count` | 10 | How many. |
| `angle`, `spread` | 0, 2π | Direction in radians and how wide the cone is (2π = every direction). Up is `-Math.PI / 2`. |
| `speedMin`, `speedMax` | 20, 80 | Pixels per second, picked at random between the two. |
| `lifeMin`, `lifeMax` | 0.4, 0.8 | Seconds before a particle disappears. |
| `sizeStart`, `sizeEnd` | 3, 0 | Size shrinks (or grows) over the life. |
| `colors` | `["#ffffff"]` | Each particle picks one. |
| `gravity` | 0 | Pixels per second², positive pulls down. Negative makes fire rise. |
| `drag` | 0 | Slows particles down; 2 = quickly. |

**Presets:** `explosion`, `sparkle`, `dust`, `smoke`, `fire`, `blood`. Copy one into your game and change numbers until it feels right; the visualization shows every setting live.

Other members: `clear()` removes everything (use it on scene change), `count()` is how many are alive.

## Why a pool?

Every particle object is created once, at the start, and reused when it dies. Creating and throwing away thousands of objects per second makes the browser's garbage collector pause the game now and then, which shows up as stutter. A pool avoids that. When the pool is full, new particles are simply skipped.
