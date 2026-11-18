# The 13k path: games that fit in 13 kilobytes

[js13kGames](https://js13kgames.com/) is a month-long jam where the **zipped** game must fit in 13 kilobytes. The full Kindling engine is far bigger than that, so this folder is a separate, much smaller starting point:

| File | What it is |
|---|---|
| [`kindling-tiny.js`](kindling-tiny.js) | The smallest useful slice of Kindling in one file: fixed-step loop, keyboard and touch, tile collision, seeded random, beeps, saved scores. About 2 KB once packed. |
| [`starter/`](starter/) | **Spark Hop**, a complete one-screen game (title, play, game over, best score). [Play it](https://normansrule.github.io/video-game-kindling/tiny/starter/). |
| [`pack.mjs`](pack.mjs) | Bundles your game into one `index.html`, zips it with maximum compression, and tells you how many bytes are left. |
| [`new-tiny-game.sh`](new-tiny-game.sh) | Makes your own copy of the starter, ready to change. |
| [`bundle.js`](bundle.js), [`zip.js`](zip.js) | How the packer works, in plain JavaScript you can read. No npm packages. |

Spark Hop packs to about **3.4 KB**, so you start with roughly 9.9 KB free.

## Make, play and pack a tiny game

Make your game (WSL Ubuntu, macOS or Linux; Node 20 or newer for packing):

```bash
cd ~/projects/kindling && bash tiny/new-tiny-game.sh my-tiny-game && cd ~/projects/my-tiny-game && python3 -m http.server 8000
```

Open <http://localhost:8000/> and press Space. Edit `main.js`, then reload. Press Ctrl+C to stop the server.

Pack it whenever you want to know where you stand (do it daily, not just at the end):

```bash
cd ~/projects/kindling && node tiny/pack.mjs ~/projects/my-tiny-game
```

It makes `~/projects/my-tiny-game-13k.zip` (the file you upload) and `~/projects/my-tiny-game-13k/index.html` (the packed page). **Always play the packed page before you submit**, because that is what the judges get:

```bash
cd ~/projects/my-tiny-game-13k && python3 -m http.server 8000
```

## What the tiny engine gives you

```js
import { start, down, hit, pointer, grid, move, overlap, random, beep, load, save, text, clamp, lerp } from "./kindling-tiny.js";

const map = grid(["#####", "#...#", "#####"], 8);   // a level as text, 8 px tiles
const player = { x: 10, y: 4, w: 6, h: 6, vx: 0, vy: 0 };

start({
  width: 160, height: 120, background: "#120c1c",
  update(seconds) {                                  // always 1/60 s
    player.vx = (down("ArrowRight") - down("ArrowLeft")) * 60;
    player.vy += 500 * seconds;
    if (player.ground && hit("Space")) { player.vy = -190; beep(330, 0.1); }
    move(player, seconds, map);                      // slides along walls, sets player.ground
  },
  draw(context) {
    context.fillStyle = "#8ef";
    context.fillRect(player.x, player.y, player.w, player.h);
  },
});
```

Every function has a bigger, commented twin in [`engine/`](../engine/). When you want to know *why* something works, read the twin: the loop is [`engine/core/loop.js`](../engine/core/loop.js), collision is [`engine/2d/physics.js`](../engine/2d/physics.js).

## When you run out of bytes

Work down this list. The first items save the most for the least effort.

1. **Cut, don't squeeze.** One mechanic done well beats three done badly. See [design-1, scope](https://normansrule.github.io/video-game-kindling/lessons/design-1-scope.html).
2. **Draw in code.** A rectangle costs a few bytes; a PNG costs hundreds. Generate levels with `random(seed)` instead of writing them out.
3. **Delete what you don't call.** `kindling-tiny.js` is yours: remove `beep`, `load`/`save` or `text` if your game doesn't use them.
4. **Use a real minifier.** `pack.mjs` only strips comments and indentation, so names stay readable. A minifier such as [Terser](https://terser.org/) also shortens names and usually saves a good share of the remaining bytes. Run it on the code between the `<script type="module">` tags of the packed page (with its "module", "compress" and "mangle" options), paste the result back, zip again and play it once more. Advanced js13k entrants also use [Roadroller](https://github.com/lifthrasiir/roadroller), which trades start-up time for size.

## Rules

Read the current [js13kGames rules](https://js13kgames.com/) before you start. They change between years. The limit has been 13,312 bytes (13 × 1024) for a long time; if it changes, run the packer with the new number, for example `KINDLING_LIMIT=15360 node tiny/pack.mjs ~/projects/my-tiny-game`. Check what the rules say about external libraries, fonts and pre-written code, and disclose AI help if the jam asks.

## How the packer works

1. `entryOf()` finds `<script type="module" src="./main.js">` in your `index.html`.
2. `bundle()` follows the `import` lines, puts each module inside its own function (so two files can both have a variable called `state`), and turns `import { a } from "./x.js"` into `const { a } = $0`.
3. `strip()` removes whole-line comments, blank lines and indentation. It never edits inside a line, so strings stay safe.
4. `makeZip()` writes a real zip: a header and DEFLATE-compressed bytes per file, then a directory at the end. The tests check its CRC-32 against the standard value.

Limits: relative imports only, named exports only (no `export default`), and no multi-line template strings.
