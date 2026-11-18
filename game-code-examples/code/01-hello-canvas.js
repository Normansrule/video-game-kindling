// Game Code Example 01: Hello canvas
// WHAT: The smallest Kindling program. Make a game, add one scene, draw shapes and text.
// WHY:  Every game starts here: createGame() makes the canvas, the loop and the input;
//       a scene is an object with update() for rules and render() for drawing.
// TRY:  Change the circle's color, or make the text say your game's name.

import { createGame } from "kindling/game.js";
import { fillRect, fillCircle, line, text } from "kindling/2d/draw.js";

const game = createGame({ width: 320, height: 180, pixelArt: true, background: "#1b2333" });

game.scenes.add("hello", {
  render(game, context) {
    // The canvas is 320 x 180 game pixels, whatever size it shows on screen.
    // (0, 0) is the top-left corner; y grows DOWNWARD.
    fillRect(context, 0, 130, 320, 50, "#3f8a55");                 // ground
    fillCircle(context, 260, 40, 18, "#ffd166");                   // sun
    fillRect(context, 60, 90, 40, 40, "#ef6a7d");                  // a block
    line(context, 20, 20, 120, 60, "#5ac8fa", 2);
    text(context, "Hello, Kindling!", 160, 150, { size: 12, align: "center", color: "#ffffff", shadow: "#000000" });
  },
});

game.start("hello");
