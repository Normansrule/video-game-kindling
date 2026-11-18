// samples/00-hello/main.js
// WHAT: Imports the engine through the import map and draws the version on a canvas.
// WHY:  If this shows "Kindling 0.0.1", the import map and the local server both work.
// DOC:  docs/RUNNING.md

import { describeEngine } from "kindling/core/version.js";

const status = document.getElementById("status");
const canvas = document.getElementById("game");
const context = canvas.getContext("2d");

const message = describeEngine();
status.textContent = "Engine loaded: " + message;

// Fill the background, then write the message in the middle.
context.fillStyle = "#14161b";
context.fillRect(0, 0, canvas.width, canvas.height);
context.fillStyle = "#ffb347";
context.font = "16px system-ui, sans-serif";
context.textAlign = "center";
context.textBaseline = "middle";
context.fillText(message, canvas.width / 2, canvas.height / 2);
