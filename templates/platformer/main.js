// templates/platformer/main.js
// WHAT: Loads scene.json and plays it. That is the whole game: the level, enemies,
//       pickups and rules all live in the scene file and the engine's components.
// WHY:  Start here, then grow it: change scene.json in the scene editor, add new
//       components in engine/scene/, or replace runScene with your own loop.
// DOC:  docs/modules/scene.md

import { runScene } from "kindling/scene/runtime.js";

const response = await fetch("./scene.json");
const scene = await response.json();

const play = runScene(scene, {
  canvas: "#game",
  width: 320,
  height: 180,
  onWin: (message) => console.log("You won:", message),
  onLose: () => console.log("Out of lives. Press R to try again."),
});

// play.game is the normal Kindling game object, so everything in the docs works here.
window.play = play;
