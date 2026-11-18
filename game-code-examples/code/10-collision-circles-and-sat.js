// Game Code Example 10: Circles and rotated shapes (SAT)
// WHAT: A spinning box and a circle you move with the mouse. They turn red on contact.
// WHY:  Boxes that rotate are no longer "axis-aligned", so AABB fails. SAT (Separating
//       Axis Theorem) checks: is there any line you could slide between the shapes?
//       If no gap exists along any edge direction, they overlap. Circles just compare
//       the distance between centers with the sum of their radii.
// TRY:  Replace the box with a triangle: createPolygon([{x:0,y:-20},{x:18,y:14},{x:-18,y:14}], 160, 90).

import { createGame } from "kindling/game.js";
import { fillCircle, fillPolygon, text } from "kindling/2d/draw.js";
import { createBoxPolygon, worldPoints, polygonCircleCollide } from "kindling/2d/sat.js";
import { circlesOverlap } from "kindling/2d/collision.js";

const game = createGame({ width: 320, height: 180, background: "#141821" });
const box = createBoxPolygon(70, 30, 160, 90);
const ball = { x: 60, y: 60, radius: 14 };
const planet = { x: 260, y: 130, radius: 22 };

game.scenes.add("play", {
  update(game, stepSeconds) {
    box.rotation += 0.8 * stepSeconds;
    ball.x = game.input.mouse.position.x;
    ball.y = game.input.mouse.position.y;
  },
  render(game, context) {
    const hitBox = polygonCircleCollide(box, ball);         // null or { depth, normal }
    const hitPlanet = circlesOverlap(ball, planet);
    fillPolygon(context, worldPoints(box), hitBox ? "#ff6b81" : "#3a4458");
    fillCircle(context, planet.x, planet.y, planet.radius, hitPlanet ? "#ff6b81" : "#3a4458");
    fillCircle(context, ball.x, ball.y, ball.radius, "#5ac8fa");
    text(context, hitBox ? "SAT: overlap, depth " + hitBox.depth.toFixed(1) : "SAT: separated", 6, 6, { color: "#9aa4b6" });
  },
});

game.start("play");
