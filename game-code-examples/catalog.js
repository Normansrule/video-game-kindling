// game-code-examples/catalog.js
// WHAT: The list of every Game Code Example: id (= file name in code/), title,
//       one-line summary, the category it belongs to and its tags.
// WHY:  The gallery, the playground's picker and the smoke test all read this one list.
//       Add an example: write code/NN-name.js, then add a line here.

export const categories = [
  { id: "start", title: "Start here", blurb: "Canvas, the game loop, input and scenes. The skeleton of every game." },
  { id: "gameplay", title: "Gameplay", blurb: "Movement, collision, physics, cameras, enemies, pathfinding and procedural maps." },
  { id: "systems", title: "Sound, saving and UI", blurb: "Sound effects, music, save files, HUDs, dialogue and inventories." },
  { id: "views", title: "2.5D views", blurb: "Isometric dioramas, raycasters, and switching one game between 2D, 2.5D and 3D." },
  { id: "3d", title: "3D", blurb: "WebGL 2 from a single cube to a lit voxel world, models, first-person controls and shaders." },
];

export const examples = [
  { id: "01-hello-canvas", title: "Hello canvas", category: "start", tags: ["2d"], summary: "Make a game, add a scene, draw shapes and text." },
  { id: "02-game-loop", title: "Game loop and delta time", category: "start", tags: ["2d", "core"], summary: "A bouncing ball that moves in pixels per second." },
  { id: "03-keyboard-movement", title: "Keyboard movement", category: "start", tags: ["2d", "input"], summary: "Named actions, acceleration and friction." },
  { id: "04-mouse-and-touch", title: "Mouse and touch", category: "start", tags: ["2d", "input"], summary: "Follow the pointer, click or tap to plant flowers." },
  { id: "05-gamepad", title: "Gamepad", category: "start", tags: ["2d", "input"], summary: "Both sticks and every button, live." },
  { id: "06-scenes-and-menus", title: "Scenes and menus", category: "start", tags: ["2d", "core"], summary: "Title, play, pause and game over screens." },
  { id: "07-timers-and-tweens", title: "Timers and tweens", category: "start", tags: ["2d", "core"], summary: "Do things later, animate any number with easing." },
  { id: "08-sprites-and-animation", title: "Sprites and animation", category: "gameplay", tags: ["2d"], summary: "A walking sprite sheet painted from text, played by an animator." },
  { id: "09-collision-boxes", title: "Box collision (AABB)", category: "gameplay", tags: ["2d", "physics"], summary: "Overlap tests and pushing out of walls." },
  { id: "10-collision-circles-and-sat", title: "Circles and rotated shapes (SAT)", category: "gameplay", tags: ["2d", "physics"], summary: "Separating Axis Theorem on a spinning box." },
  { id: "11-platformer-physics", title: "Platformer physics", category: "gameplay", tags: ["2d", "physics"], summary: "Gravity, jumping, coyote time and a text tilemap." },
  { id: "12-top-down-tilemap", title: "Top-down tilemap", category: "gameplay", tags: ["2d", "physics"], summary: "RPG-style movement with solid walls, trees and water." },
  { id: "13-camera-follow-and-shake", title: "Camera follow, zoom and shake", category: "gameplay", tags: ["2d"], summary: "A smooth camera in a world bigger than the screen." },
  { id: "14-particles-and-juice", title: "Particles and juice", category: "gameplay", tags: ["2d", "feel"], summary: "Explosions, screen shake, flash and hit stop." },
  { id: "15-enemy-ai-state-machine", title: "Enemy AI state machine", category: "gameplay", tags: ["2d", "ai"], summary: "Patrol, chase and return, one function per state." },
  { id: "16-pathfinding-a-star", title: "Pathfinding with A*", category: "gameplay", tags: ["2d", "ai"], summary: "Shortest path around walls, with the search shown." },
  { id: "17-procedural-noise-map", title: "Procedural map from noise", category: "gameplay", tags: ["2d", "procedural"], summary: "Seeded islands from fractal noise." },
  { id: "18-object-pool-bullets", title: "Object pool for bullets", category: "gameplay", tags: ["2d", "performance"], summary: "Reuse objects instead of making garbage." },
  { id: "19-spawning-waves", title: "Enemy waves", category: "gameplay", tags: ["2d", "design"], summary: "A wave table and a director that paces the action." },
  { id: "20-sound-effects", title: "Sound effects from code", category: "systems", tags: ["audio"], summary: "Every built-in sound, plus a custom sweep." },
  { id: "21-music-sequencer", title: "Music sequencer", category: "systems", tags: ["audio"], summary: "A looping tune with a lookahead scheduler. Click to edit notes." },
  { id: "22-save-and-load", title: "Save and load", category: "systems", tags: ["core"], summary: "High scores and settings that survive a reload." },
  { id: "23-ui-hud-and-buttons", title: "HUD and buttons", category: "systems", tags: ["ui"], summary: "Health bar, counters and buttons with hover and press." },
  { id: "24-dialogue-box", title: "Dialogue with choices", category: "systems", tags: ["ui", "story"], summary: "Typewriter text and branching choices from data." },
  { id: "25-inventory-grid", title: "Inventory grid", category: "systems", tags: ["ui"], summary: "Pick up, drop, stack and swap items." },
  { id: "26-isometric-world", title: "Isometric world", category: "views", tags: ["2.5d"], summary: "A block diorama; walk and place blocks." },
  { id: "27-raycaster-first-person", title: "Raycaster first person", category: "views", tags: ["2.5d"], summary: "A textured maze with fog and coin sprites." },
  { id: "28-switch-2d-25d-3d", title: "Switch 2D, 2.5D and 3D", category: "views", tags: ["2d", "2.5d", "3d"], summary: "One island, five views, keys 1 to 5." },
  { id: "29-3d-hello-cube", title: "3D hello cube", category: "3d", tags: ["3d"], summary: "A lit, spinning cube and an orbit camera." },
  { id: "30-3d-voxel-world", title: "3D block world", category: "3d", tags: ["3d", "procedural"], summary: "Shadows, ambient occlusion, fog, sky and sea." },
  { id: "31-3d-low-poly-models", title: "Low-poly models", category: "3d", tags: ["3d"], summary: "Trees, rocks, a bench and an animated character, all from code." },
  { id: "32-3d-first-person-controls", title: "First-person controls", category: "3d", tags: ["3d", "input"], summary: "Pointer lock mouse look, walking and jumping." },
  { id: "33-3d-day-night-cycle", title: "Day and night", category: "3d", tags: ["3d"], summary: "Sunsets, stars and lanterns that light up." },
  { id: "34-3d-break-and-place-blocks", title: "Break and place blocks", category: "3d", tags: ["3d", "input"], summary: "Mouse picking with a ray through the block grid." },
  { id: "35-shader-playground", title: "Write your own shader", category: "3d", tags: ["3d", "shader"], summary: "A full-screen GLSL shader you can edit live." },
];
