// samples/3d/03-raycaster-maze/main.js
// WHAT: Escape a maze in first person, Wolfenstein-style. The green wall is the exit.
//       Every run makes a new maze. Press M for the map.
// WHY:  A complete 3D game with NO WebGL: just a grid, rays, and Canvas 2D stripes.
//       Also shows how to GENERATE a level (a perfect maze) instead of drawing it.
// TEACHES: raycasting, grid collision, maze generation, mouse look with pointer lock.
// README: samples/3d/03-raycaster-maze/README.md

import { createGame } from "kindling/game.js";
import { castRays, drawRaycastView, moveInGrid } from "kindling/3d/raycaster.js";
import { fillRect, text, dim } from "kindling/2d/draw.js";
import { createAudio } from "kindling/audio/audio.js";
import { playSfx } from "kindling/audio/sfx.js";
import { createRandom } from "kindling/math/random.js";
import { degreesToRadians } from "kindling/math/scalar.js";

const WIDTH = 320;
const HEIGHT = 200;
const MAZE_CELLS = 7;                     // the maze is 7 x 7 rooms -> a 15 x 15 grid
const WALK_SPEED = 2.6;                   // grid cells per second
const TURN_SPEED = 2.4;                   // radians per second
const FIELD_OF_VIEW = degreesToRadians(66);
const WALL_COLORS = { "#": "#9aa0b0", E: "#3fbf6a" };

const game = createGame({
  width: WIDTH,
  height: HEIGHT,
  background: "#000000",
  actions: {
    forward: ["KeyW", "ArrowUp", "pad:Up", "pad:LeftY-", "touch:forward"],
    back: ["KeyS", "ArrowDown", "pad:Down", "pad:LeftY+", "touch:back"],
    turnLeft: ["ArrowLeft", "pad:Left", "pad:RightX-", "touch:left"],
    turnRight: ["ArrowRight", "pad:Right", "pad:RightX+", "touch:right"],
    strafeLeft: ["KeyA", "pad:LeftX-"],
    strafeRight: ["KeyD", "pad:LeftX+"],
    map: ["KeyM", "pad:Y"],
    start: ["Space", "Enter", "pad:A", "mouse:0"],
  },
});
const touch = game.input.touch;
touch.addButton("forward", 40, 120, 34, 34, "▲");
touch.addButton("back", 40, 160, 34, 34, "▼");
touch.addButton("left", 4, 140, 34, 34, "↶");
touch.addButton("right", 76, 140, 34, 34, "↷");

const audio = createAudio();
const random = createRandom();
let grid = [];
let player = { x: 1.5, y: 1.5, angle: 0 };
let showMap = false;
let seconds = 0;
let mazesSolved = 0;

// "Recursive backtracker": walk randomly, knocking down walls, and back up when stuck.
// The result is a "perfect" maze: exactly one path between any two places.
function generateMaze(cells) {
  const size = cells * 2 + 1;
  const rows = [];
  for (let row = 0; row < size; row++) rows.push(new Array(size).fill("#"));
  const stack = [{ column: 0, row: 0 }];
  const visited = new Set(["0,0"]);
  rows[1][1] = ".";
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = [];
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const column = current.column + dc;
      const row = current.row + dr;
      if (column >= 0 && row >= 0 && column < cells && row < cells && !visited.has(column + "," + row)) {
        neighbors.push({ column, row, dc, dr });
      }
    }
    if (neighbors.length === 0) {
      stack.pop();   // dead end: back up
      continue;
    }
    const next = random.pick(neighbors);
    // Knock down the wall between the two rooms, and open the next room.
    rows[current.row * 2 + 1 + next.dr][current.column * 2 + 1 + next.dc] = ".";
    rows[next.row * 2 + 1][next.column * 2 + 1] = ".";
    visited.add(next.column + "," + next.row);
    stack.push(next);
  }
  rows[size - 2][size - 1] = "E";   // the exit: the outer wall next to the far corner
  return rows.map((row) => row.join(""));
}

function newMaze() {
  grid = generateMaze(MAZE_CELLS);
  player = { x: 1.5, y: 1.5, angle: grid[1][2] === "." ? 0 : Math.PI / 2 };
  seconds = 0;
}

game.scenes.add("title", {
  enter: newMaze,
  update(game) {
    if (game.actions.wasPressed("start") || touch.wasTapped()) {
      game.input.mouse.lock();   // hide the cursor for mouse look (Escape gives it back)
      game.scenes.switchTo("play");
    }
  },
  render(game, context) {
    fillRect(context, 0, 0, WIDTH, HEIGHT, "#101218");
    text(context, "THE MAZE", WIDTH / 2, 50, { size: 24, align: "center", bold: true, color: "#3fbf6a" });
    text(context, "W/S walk · A/D step sideways · arrows or mouse turn", WIDTH / 2, 95, { align: "center" });
    text(context, "Find the green wall. M shows the map.", WIDTH / 2, 110, { align: "center", color: "#aaaaaa" });
    text(context, "Click, Space or tap to start", WIDTH / 2, 140, { align: "center", color: "#ffd166" });
  },
});

game.scenes.add("play", {
  update(game, stepSeconds) {
    seconds += stepSeconds;
    const actions = game.actions;
    player.angle += actions.axis("turnLeft", "turnRight") * TURN_SPEED * stepSeconds;
    if (game.input.mouse.isLocked()) player.angle += game.input.mouse.movement().x * 0.003;
    if (actions.wasPressed("map")) showMap = !showMap;

    const forward = actions.axis("back", "forward") * WALK_SPEED * stepSeconds;
    const sideways = actions.axis("strafeLeft", "strafeRight") * WALK_SPEED * stepSeconds;
    const cos = Math.cos(player.angle);
    const sin = Math.sin(player.angle);
    // Forward is along the view angle; sideways is 90 degrees to it.
    moveInGrid(grid, player, cos * forward - sin * sideways, sin * forward + cos * sideways);

    // Next to the exit?
    const exitRow = grid.length - 2;
    const exitColumn = grid.length - 1;
    if (Math.floor(player.y) === exitRow && Math.floor(player.x) === exitColumn - 1 && player.x > exitColumn - 1.35) {
      mazesSolved += 1;
      playSfx(audio, "powerup");
      game.scenes.push("escaped");
    }
  },
  render(game, context) {
    const hits = castRays(grid, player, FIELD_OF_VIEW, WIDTH / 2);
    drawRaycastView(context, hits, WIDTH, HEIGHT, { wallColors: WALL_COLORS, ceilingColor: "#1d2030", floorColor: "#3a3530", shadeDistance: 9 });
    if (showMap) drawMap(context);
    text(context, seconds.toFixed(1) + " s", WIDTH - 6, 6, { align: "right", shadow: "#000000" });
    if (!game.input.mouse.isLocked()) text(context, "click to use the mouse", 6, 6, { color: "#888888", shadow: "#000000" });
  },
});

function drawMap(context) {
  const cell = 5;
  const left = WIDTH - grid.length * cell - 6;
  const top = 18;
  dim(context, WIDTH, HEIGHT, 0.3);
  for (let row = 0; row < grid.length; row++) {
    for (let column = 0; column < grid[row].length; column++) {
      const character = grid[row][column];
      const color = character === "#" ? "#9aa0b0" : character === "E" ? "#3fbf6a" : "#202430";
      fillRect(context, left + column * cell, top + row * cell, cell, cell, color);
    }
  }
  fillRect(context, left + player.x * cell - 2, top + player.y * cell - 2, 4, 4, "#ffd166");
}

game.scenes.add("escaped", {
  update(game) {
    if (game.actions.wasPressed("start") || touch.wasTapped()) {
      game.scenes.pop();
      newMaze();
    }
  },
  render(game, context) {
    dim(context, WIDTH, HEIGHT, 0.6);
    text(context, "YOU ESCAPED!", WIDTH / 2, 70, { size: 16, align: "center", bold: true, color: "#3fbf6a" });
    text(context, "Time " + seconds.toFixed(1) + " s · mazes solved " + mazesSolved, WIDTH / 2, 100, { align: "center" });
    text(context, "Click, Space or tap for a new maze", WIDTH / 2, 120, { align: "center", color: "#aaaaaa" });
  },
});

game.start("title");
