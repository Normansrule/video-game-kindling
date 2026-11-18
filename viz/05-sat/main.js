// viz/05-sat/main.js
// WHAT: Two polygons, one candidate axis at a time, and their shadows on it.

import { createBoxPolygon, createPolygon, worldPoints, edgeNormals, project, polygonsCollide } from "kindling/2d/sat.js";
import { themeColors, setupCanvas, createRunner, createControls, label } from "../kit.js";

const WIDTH = 720;
const HEIGHT = 400;
const view = setupCanvas(document.getElementById("stage"), WIDTH, HEIGHT);
const context = view.context;

const polygonA = createBoxPolygon(130, 70, 270, 190, 0.3);
const polygonB = createPolygon([{ x: 0, y: -70 }, { x: 70, y: 50 }, { x: -70, y: 50 }], 450, 200, -0.2);
const state = { axisIndex: 0, spin: false };
let dragging = null;

function allAxes() {
  return edgeNormals(worldPoints(polygonA)).concat(edgeNormals(worldPoints(polygonB)));
}

function tick(seconds) {
  if (state.spin) {
    polygonA.rotation += seconds * 0.6;
    polygonB.rotation -= seconds * 0.4;
  }
  draw();
}

function drawPolygon(points, color) {
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (const point of points) context.lineTo(point.x, point.y);
  context.closePath();
  context.globalAlpha = 0.18;
  context.fillStyle = color;
  context.fill();
  context.globalAlpha = 1;
  context.stroke();
}

function draw() {
  const colors = themeColors();
  context.fillStyle = colors.background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  const pointsA = worldPoints(polygonA);
  const pointsB = worldPoints(polygonB);
  const axes = allAxes();
  const axis = axes[state.axisIndex % axes.length];

  // Draw the axis as a line through the middle of the picture.
  const centerX = WIDTH / 2;
  const centerY = HEIGHT / 2;
  context.strokeStyle = colors.border;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(centerX - axis.x * 800, centerY - axis.y * 800);
  context.lineTo(centerX + axis.x * 800, centerY + axis.y * 800);
  context.stroke();

  drawPolygon(pointsA, colors.accent2);
  drawPolygon(pointsB, colors.accent);

  // Shadows: project each shape onto the axis, then draw them along the axis line,
  // offset sideways a little so you can see both.
  const shadowA = project(pointsA, axis);
  const shadowB = project(pointsB, axis);
  const centerOnAxis = centerX * axis.x + centerY * axis.y;
  const side = { x: -axis.y, y: axis.x };
  function drawShadow(shadow, offset, color) {
    const start = shadow.min - centerOnAxis;
    const end = shadow.max - centerOnAxis;
    context.strokeStyle = color;
    context.lineWidth = 8;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(centerX + axis.x * start + side.x * offset, centerY + axis.y * start + side.y * offset);
    context.lineTo(centerX + axis.x * end + side.x * offset, centerY + axis.y * end + side.y * offset);
    context.stroke();
    context.lineCap = "butt";
  }
  drawShadow(shadowA, -8, colors.accent2);
  drawShadow(shadowB, 8, colors.accent);

  const gap = Math.max(shadowA.min, shadowB.min) - Math.min(shadowA.max, shadowB.max);
  const separatedHere = gap > 0;
  const result = polygonsCollide(polygonA, polygonB);
  const owner = state.axisIndex % axes.length < pointsA.length ? "an edge of A" : "an edge of B";
  label(context, "Axis " + (state.axisIndex % axes.length + 1) + " of " + axes.length + " (at right angles to " + owner + ")", 16, 22, colors.text, 15);
  label(context, separatedHere ? "Gap on this axis: the shapes are apart." : "Shadows overlap on this axis.", 16, 46, separatedHere ? colors.good : colors.bad, 15);
  label(context, result ? "Overall: touching (every axis overlaps)" : "Overall: apart (at least one axis has a gap)", 16, HEIGHT - 20, result ? colors.bad : colors.good, 15);
}

// Drag either polygon.
view.canvas.style.touchAction = "none";
view.canvas.addEventListener("pointerdown", (event) => {
  const point = view.toLocal(event);
  const distanceA = Math.hypot(point.x - polygonA.x, point.y - polygonA.y);
  const distanceB = Math.hypot(point.x - polygonB.x, point.y - polygonB.y);
  dragging = distanceA < distanceB ? polygonA : polygonB;
  view.canvas.setPointerCapture(event.pointerId);
});
view.canvas.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  const point = view.toLocal(event);
  dragging.x = point.x;
  dragging.y = point.y;
  draw();
});
view.canvas.addEventListener("pointerup", () => { dragging = null; });

const controls = createControls(document.getElementById("controls"));
const [spinButton] = controls.addButtons([
  { label: "Spin", primary: true },
  { label: "Next axis", onClick: () => { state.axisIndex = (state.axisIndex + 1) % allAxes().length; draw(); } },
]);
controls.addSlider({ label: "Rotate A", min: -180, max: 180, value: 17, unit: "°", onChange: (value) => { polygonA.rotation = (value * Math.PI) / 180; draw(); } });
controls.addSlider({ label: "Rotate B", min: -180, max: 180, value: -11, unit: "°", onChange: (value) => { polygonB.rotation = (value * Math.PI) / 180; draw(); } });

// The play button here toggles spinning.
const runner = createRunner(tick, spinButton);
runner.setPlaying(false);
spinButton.textContent = "Spin";
spinButton.addEventListener("click", () => {
  state.spin = runner.isPlaying();
  spinButton.textContent = state.spin ? "Stop spinning" : "Spin";
});
document.getElementById("readout").textContent = "Tip: drag a shape, press Next axis to test each direction.";
window.addEventListener("kindling-theme-change", draw);
