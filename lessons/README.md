# lessons/

Open them in a browser: <https://normansrule.github.io/video-game-kindling/lessons/> or locally at <http://localhost:8000/lessons/>.

Every lesson has the same shape: **1** the idea, **2** an embedded visualization, **3** a code walkthrough, **4** an exercise with hints and a hidden solution, **5** a "you now know" checklist (ticks are saved in your browser).

## 2D track

Canvas 2D games from the loop up: input, collision, physics, levels and juice.

1. [The game loop](2d-1-game-loop.html): Why games update in fixed steps, and how the accumulator makes a game run the same on every screen.
2. [Drawing and input](2d-2-drawing-input.html): Draw with Canvas 2D, and read keyboard, mouse, touch and gamepad through named actions.
3. [Collision](2d-3-collision.html): Detect when boxes and circles touch, and push them apart with the smallest move.
4. [Platformer physics](2d-4-platformer-physics.html): Gravity, velocity, moving one axis at a time, and the tricks that make jumping feel good.
5. [Tilemaps and the camera](2d-5-tilemaps-camera.html): Build levels from text grids and scroll them with a smooth camera that stays inside the level.
6. [Juice: particles, shake, tweens and sound](2d-6-juice.html): Make actions feel good with particles, screen shake, tweens, hit-stop and sound effects.

## 3D track

Matrices, meshes and light with WebGL 2, a raycaster with no WebGL at all, and a first-person walk.

1. [3D transforms: model, view, projection](3d-1-transforms.html): How three matrices move a 3D object to the right place on a 2D screen.
2. [Meshes and lighting](3d-2-meshes-lighting.html): Triangles, normals and Phong lighting: ambient, diffuse and specular.
3. [The raycaster: 3D without WebGL](3d-3-raycaster.html): Cast one ray per screen column across a grid map and draw walls whose height is one over the distance.
4. [A first-person walk](3d-4-first-person.html): Mouse look with pointer lock, walking relative to where you look, collision with 3D boxes, and fog.

## Game design track

Scope a jam game you can finish, make it feel good, playtest it and ship it.

1. [Scope: a game you can finish](design-1-scope.html): Pick a jam idea you can finish: one verb, a must/should/could list, and a budget that assumes everything takes twice as long.
2. [Game feel](design-2-game-feel.html): Why the same game can feel stiff or great: response, easing, anticipation, and squash and stretch.
3. [Playtest and ship](design-3-playtest-ship.html): Watch someone play without helping, write down what happens, fix the biggest problem, and ship to itch.io.

Lesson pages are plain HTML with no build step. To add one, copy an existing lesson and keep the five sections.
