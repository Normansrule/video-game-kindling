// viz/04-collision/main.js
// WHAT: Drag shape A over shape B. Shows overlap, the push-out vector and where A ends up.

import * as collision from "kindling/2d/collision.js";
import { themeColors, setupCanvas, createControls, label } from "../kit.js";

const WIDTH = 720;
const HEIGHT = 360;
const view = setupCanvas(document.getElementById("stage"), WIDTH, HEIGHT);
const context = view.context;

const state = { mode: "box vs box" };
const shapeA = { x: 250, y: 140, width: 120, height: 80, radius: 50 };
const shapeB = { x: 400, y: 120, width: 140, height: 120, radius: 70 };
let dragging = null;
let dragOffset = { x: 0, y: 0 };

// In this viz, x/y is the CENTER for both kinds of shape. These turn that into engine shapes.
function asRect(shape) {
  return { x: shape.x - shape.width / 2, y: shape.y - shape.height / 2, width: shape.width, height: shape.height };
}
function asCircle(shape) {
  return { x: shape.x, y: shape.y, radius: shape.radius };
}
const aIsCircle = () => state.mode !== "box vs box";
const bIsCircle = () => state.mode === "circle vs circle";

function test() {
  if (state.mode === "box vs box") return collision.rectPushOut(asRect(shapeA), asRect(shapeB));
  if (state.mode === "circle vs circle") return collision.circlePushOut(asCircle(shapeA), asCircle(shapeB));
  return collision.circleRectPushOut(asCircle(shapeA), asRect(shapeB));
}

function drawShape(shape, isCircle, fill, stroke, dashed) {
  context.fillStyle = fill;
  context.strokeStyle = stroke;
  context.lineWidth = 2;
  context.setLineDash(dashed ? [6, 5] : []);
  if (isCircle) {
    context.beginPath();
    context.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
    if (fill) context.fill();
    context.stroke();
  } else {
    const rect = asRect(shape);
    if (fill) context.fillRect(rect.x, rect.y, rect.width, rect.height);
    context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  }
  context.setLineDash([]);
}

function arrow(fromX, fromY, toX, toY, color) {
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
  const angle = Math.atan2(toY - fromY, toX - fromX);
  context.beginPath();
  context.moveTo(toX, toY);
  context.lineTo(toX - 12 * Math.cos(angle - 0.4), toY - 12 * Math.sin(angle - 0.4));
  context.lineTo(toX - 12 * Math.cos(angle + 0.4), toY - 12 * Math.sin(angle + 0.4));
  context.closePath();
  context.fill();
}

function draw() {
  const colors = themeColors();
  context.fillStyle = colors.background;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  const push = test();
  const hitColor = push ? colors.bad : colors.accent2;

  drawShape(shapeB, bIsCircle(), null, colors.muted, false);
  label(context, "B", shapeB.x, shapeB.y, colors.muted, 16, "center");
  context.globalAlpha = 0.25;
  drawShape(shapeA, aIsCircle(), hitColor, hitColor, false);
  context.globalAlpha = 1;
  drawShape(shapeA, aIsCircle(), null, hitColor, false);
  label(context, "A", shapeA.x, shapeA.y, colors.text, 16, "center");

  // Circle vs box: show the closest point on the box.
  if (state.mode === "circle vs box") {
    const closest = collision.closestPointInRect(shapeA.x, shapeA.y, asRect(shapeB));
    context.fillStyle = colors.text;
    context.beginPath();
    context.arc(closest.x, closest.y, 4, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = colors.muted;
    context.setLineDash([3, 3]);
    context.beginPath();
    context.moveTo(shapeA.x, shapeA.y);
    context.lineTo(closest.x, closest.y);
    context.stroke();
    context.setLineDash([]);
  }

  if (push) {
    const resolved = { ...shapeA, x: shapeA.x + push.x, y: shapeA.y + push.y };
    drawShape(resolved, aIsCircle(), null, colors.accent, true);
    arrow(shapeA.x, shapeA.y, shapeA.x + push.x, shapeA.y + push.y, colors.accent);
  }
  label(context, push ? "Overlapping: push A by (" + push.x.toFixed(1) + ", " + push.y.toFixed(1) + ")" : "Not touching", 16, 22, push ? colors.bad : colors.muted, 15);
}

// Dragging with mouse, pen or finger.
const canvas = view.canvas;
canvas.addEventListener("pointerdown", (event) => {
  const point = view.toLocal(event);
  const shapes = [shapeA, shapeB];
  for (const shape of shapes) {
    if (Math.abs(point.x - shape.x) < (shape.width / 2 || shape.radius) + 10 &&
        Math.abs(point.y - shape.y) < (shape.height / 2 || shape.radius) + 10) {
      dragging = shape;
      dragOffset = { x: shape.x - point.x, y: shape.y - point.y };
      canvas.setPointerCapture(event.pointerId);
      break;
    }
  }
});
canvas.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  const point = view.toLocal(event);
  dragging.x = point.x + dragOffset.x;
  dragging.y = point.y + dragOffset.y;
  draw();
});
canvas.addEventListener("pointerup", () => { dragging = null; });
canvas.style.touchAction = "none";

// Keyboard: arrow keys move A while the picture has focus.
canvas.addEventListener("keydown", (event) => {
  const moves = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] };
  if (!moves[event.key]) return;
  event.preventDefault();
  shapeA.x += moves[event.key][0];
  shapeA.y += moves[event.key][1];
  draw();
});

const controls = createControls(document.getElementById("controls"));
controls.addSelect("Shapes", ["box vs box", "circle vs circle", "circle vs box"], state.mode, (value) => { state.mode = value; draw(); });
controls.addButtons([{ label: "Overlap them", onClick: () => { shapeA.x = shapeB.x - 40; shapeA.y = shapeB.y + 10; draw(); } }]);

const readout = document.getElementById("readout");
readout.textContent = "Tip: drag shape A onto shape B.";
draw();
window.addEventListener("kindling-theme-change", draw);
