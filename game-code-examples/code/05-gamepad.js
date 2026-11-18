// Game Code Example 05: Gamepad
// WHAT: Shows both sticks and every button of a connected controller, live.
// WHY:  Browsers expose controllers through the Gamepad API. Kindling names the buttons
//       (A, B, X, Y, Start...) and the axes (LeftX, LeftY, RightX, RightY) so your code
//       reads like the controller. Press any button first: browsers hide pads until then.
// TRY:  Add a dead zone: ignore stick values smaller than 0.15.

import { createGame } from "kindling/game.js";
import { fillCircle, strokeCircle, text } from "kindling/2d/draw.js";

const game = createGame({ width: 320, height: 180, background: "#141821" });
const BUTTONS = ["A", "B", "X", "Y", "LB", "RB", "Back", "Start", "Up", "Down", "Left", "Right"];

function drawStick(context, x, y, valueX, valueY, label) {
  strokeCircle(context, x, y, 22, "#3a4458", 2);
  fillCircle(context, x + valueX * 18, y + valueY * 18, 8, "#5ac8fa");
  text(context, label, x, y + 28, { align: "center", color: "#9aa4b6" });
}

game.scenes.add("pad", {
  render(game, context) {
    const pad = game.input.gamepad;
    if (!pad.isConnected()) {
      text(context, "Connect a controller and press a button", 160, 84, { align: "center", color: "#9aa4b6" });
      return;
    }
    drawStick(context, 70, 80, pad.axis("LeftX"), pad.axis("LeftY"), "left stick");
    drawStick(context, 250, 80, pad.axis("RightX"), pad.axis("RightY"), "right stick");
    BUTTONS.forEach((name, index) => {
      const x = 110 + (index % 4) * 34;
      const y = 50 + Math.floor(index / 4) * 30;
      fillCircle(context, x, y, 10, pad.isDown(name) ? "#ff9f43" : "#252d3c");
      text(context, name, x, y + 12, { align: "center", size: 7, color: "#9aa4b6" });
    });
  },
});

game.start("pad");
