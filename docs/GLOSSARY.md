# Glossary

Words and acronyms used across Kindling, in plain English. Each doc also spells out an acronym the first time it uses it.

| Term | Meaning |
|---|---|
| **AABB** | Axis-aligned bounding box: a rectangle (or box in 3D) that never rotates. The cheapest collision shape. |
| **Accumulator** | In a fixed-timestep loop, the real time not yet simulated. Steps are taken while it holds at least one step. |
| **Alpha** (render) | How far between the last step and the next one we are, from 0 to 1. Used to draw smoothly. |
| **Ambient, diffuse, specular** | The three parts of Phong lighting: light everywhere, light on surfaces facing the light, and the shiny highlight. |
| **API** | Application programming interface: the functions a module offers you. |
| **Aspect ratio** | Width divided by height. 16:9 screens have an aspect of about 1.78. |
| **Canvas 2D** | The browser's built-in 2D drawing API on a `<canvas>` element. |
| **Coyote time** | Allowing a jump for a moment after running off a ledge. Feels fair, even though it is not "realistic". |
| **CSS** | Cascading Style Sheets: how web pages are styled. |
| **Dead zone** | A range where input or movement is ignored: stick drift on a gamepad, or a box where the camera does not follow. |
| **DDA** | Digital differential analyzer: stepping a ray through a grid one cell edge at a time. How the raycaster finds walls. |
| **Delta time / step** | Seconds since the last update. In Kindling, `stepSeconds`, and it is fixed. |
| **DPI / DPR** | Dots per inch / device pixel ratio: how many real screen pixels make one CSS pixel (2 on most phones). |
| **Easing** | A curve that shapes motion over time, such as starting fast and settling slowly. |
| **ES modules** | ECMAScript modules: JavaScript files that `import` and `export`, loaded by the browser directly. |
| **Factory** | A function that makes and returns an object: `createCamera()`. Kindling's alternative to classes. |
| **Fisheye** | The bulging walls a naive raycaster draws. Fixed by measuring distance at right angles to the camera. |
| **Fixed timestep** | Updating the game in equal-sized steps no matter how fast frames arrive, so it plays the same on every screen. |
| **FOV** | Field of view: how wide the camera sees, as an angle. |
| **Fragment shader** | A small GPU program run for every pixel of a triangle. Decides its color. |
| **Game feel / juice** | Small extras (screen shake, particles, sound, squash and stretch) that make actions feel good. |
| **GLSL** | OpenGL Shading Language: the C-like language WebGL shaders are written in. |
| **GPU** | Graphics processing unit: the graphics card. |
| **HUD** | Heads-up display: score, health and timers drawn on top of the game. |
| **Import map** | A `<script type="importmap">` block that tells the browser where `kindling/...` imports live. |
| **Lerp** | Linear interpolation: blending between two values by a fraction t. |
| **Matrix (4×4)** | A grid of 16 numbers that moves, turns and scales 3D points. |
| **Mesh** | A 3D shape made of triangles: corner positions, normals, texture coordinates and indices. |
| **Model, view, projection** | The three matrices of 3D: where the object is, where the camera is, and how the lens flattens 3D to 2D. |
| **Normal** | A length-1 arrow pointing straight out of a surface. Lighting depends on it. |
| **OBJ** | A simple text format for 3D models (`.obj`). |
| **Particle** | A tiny, short-lived dot used for sparks, smoke and dust. |
| **Phong** | A classic lighting model with ambient, diffuse and specular parts. |
| **Pointer lock** | Hiding and trapping the mouse so its movement can turn a first-person camera. |
| **Pool** | Objects created once and reused, so the game does not pause for garbage collection. |
| **Raycaster** | Fake 3D: one ray per screen column across a grid map; wall height = 1 / distance. |
| **Quaternion** | Four numbers that store a rotation without gimbal lock and blend smoothly. |
| **SAT** | Separating Axis Theorem: two convex shapes do not touch if some direction separates their shadows. |
| **Scene** | One screen of a game: title, play, pause, game over. |
| **Seed** | The starting number of a random generator. Same seed, same sequence. |
| **Sprite / sprite sheet** | A 2D image of a game object / one image holding many same-sized frames. |
| **Texture, UV** | An image wrapped onto a 3D surface / the 0-to-1 coordinates that say which part of the image goes where. |
| **Tilemap** | A level made of a grid of tiles. |
| **Tween** | Animating a number from one value to another over time, usually with easing. |
| **VAO** | Vertex array object: WebGL's saved description of how a mesh's data is laid out. |
| **Vector** | A pair (or triple) of numbers used as a position, a velocity or a direction. |
| **Vertex shader** | A small GPU program run for every corner of a mesh. Decides where it lands on screen. |
| **WCAG** | Web Content Accessibility Guidelines. Kindling's pages aim for level AA (contrast, keyboard use). |
| **WebGL 2** | Web Graphics Library 2: the browser's API for drawing 3D with the GPU. |
