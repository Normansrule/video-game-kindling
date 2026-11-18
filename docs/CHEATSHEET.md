# Kindling cheat sheet

The calls you will use 90% of the time. Full details: [modules](modules/).

## A new game

```html
<canvas id="game"></canvas>
<script type="importmap">{ "imports": { "kindling/": "./engine/" } }</script>
<script type="module" src="./main.js"></script>
```

```js
import { createGame } from "kindling/game.js";
const game = createGame({ width: 320, height: 180, pixelArt: true, actions: { jump: ["Space", "pad:A", "touch:jump"] } });
game.scenes.add("play", {
  enter(game, data) {},                       // scene starts
  update(game, stepSeconds) {},               // rules and movement (fixed steps)
  render(game, context, alpha) {},            // drawing only
  exit(game) {},
});
game.start("play");
```

Scenes: `game.scenes.switchTo("over", { score })`, `push("pause")`, `pop()`. Data for every scene: `game.state`.

## Input

```js
game.actions.isDown("left")      game.actions.wasPressed("jump")      game.actions.axis("left", "right")   // -1, 0, 1
game.input.keyboard.wasPressed("KeyR")     game.input.mouse.position     game.input.mouse.wasPressed(0)
game.input.touch.addButton("jump", 280, 140, 32, 32, "A")     game.input.gamepad.axis("LeftX")
```

Binding strings: `"KeyW"`, `"Space"`, `"ArrowUp"`, `"mouse:0"`, `"pad:A"`, `"pad:LeftX-"`, `"touch:jump"`.

## Drawing (2D)

```js
fillRect(context, x, y, w, h, color)    fillCircle(context, x, y, r, color)    line(context, x1, y1, x2, y2, color)
text(context, "HI", x, y, { size: 8, color: "#fff", align: "center", shadow: "#000" })
sheet = createSpriteSheet(image, 16, 16);   sheet.draw(context, frame, x, y, { flipX, scale, rotation, alpha })
animator = createAnimator({ run: createAnimation([2, 3, 4, 5], 12) });   animator.play("run");  animator.update(dt);  animator.frame()
```

## Collision and physics

```js
rectsOverlap(a, b)    circlesOverlap(a, b)    circleRectOverlap(c, r)    pointInRect(p, r)
rectPushOut(a, b)     // null or { x, y } to move a out of b
polygonsCollide(polyA, polyB)   // SAT: null or { depth, normal }
body = createBody({ x, y, width, height, gravity: 900 });   moveAndCollide(body, dt, world);   body.onGround
level = createTilemap({ rows, tileSize: 16, solid: "#", oneWay: "=" });   level.replace("C", ".")   level.draw(context, drawTile, camera.view())
```

## Camera, particles, tweens, timers, sound, saving

```js
camera = createCamera({ width: 320, height: 180, bounds, smoothing: 8 });  camera.follow(player, dt);  camera.update(dt);  camera.shake(4, 0.2)
camera.begin(context); /* world */ camera.end(context); /* HUD */
particles.emit({ ...presets.explosion, x, y });   particles.update(dt);   particles.render(context, true)
game.tweens.to(button, { scale: 1.2 }, 0.15, easeOutBack);     game.timers.after(2, () => game.scenes.switchTo("title"))
playSfx(audio, "coin")    playTone(audio, { type: "square", frequency: 220, frequencyEnd: 660, duration: 0.15 })
storage = createStorage("my-game");   storage.save("best", 1200);   storage.load("best", 0)
```

## 3D

```js
const game = createGame({ webgl: true, width: 640, height: 360 });
const renderer = createRenderer(game.screen);           renderer.setFog(30)
const mesh = createMesh(game.gl, box(1, 1, 1));          // or sphere(), plane(), parseOBJ(text)
const camera = createOrbitCamera({ distance: 6 });       // or createFirstPersonCamera()
renderer.begin(camera, { position: [5, 8, 5], color: [1, 1, 1], ambient: 0.3 });
renderer.drawMesh(mesh, mat4.translation(0, 0.5, 0), { color: [1, 0.5, 0.2], texture });
moveAndCollide3D(body3d, dt, boxes)     rayBox(origin, direction, box)
```

## Math

```js
clamp(v, 0, 1)   lerp(a, b, t)   approach(v, target, maxStep)   damp(v, target, 8, dt)   remap(v, 0, 100, 0, 48)
vec2.add / subtract / scale / normalize / length / distance / dot / rotate / fromAngle(angle, size)
const random = createRandom(seed);   random.range(a, b)   random.int(1, 6)   random.pick(list)   random.chance(0.1)
```

## Run, test, ship

```bash
cd ~/projects/kindling && python3 -m http.server 8000      # then http://localhost:8000/
cd ~/projects/kindling && node --test tests/node.test.js   # unit checks
cd ~/projects/kindling && ./jam/new-game.sh my-jam-game     # a jam game folder with its own engine copy
```

Keyboard: `` ` `` toggles the debug overlay in any game made with `createGame`.
