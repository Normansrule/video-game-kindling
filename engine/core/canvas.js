// engine/core/canvas.js
// WHAT: Sets up a <canvas> at a fixed game resolution and scales it to fit the window.
// WHY:  You design the game at one size (say 320 x 180) and never think about
//       screen sizes again. Pixel-art games stay blocky and crisp; smooth games draw
//       at the screen's real resolution, so text and circles stay sharp when scaled up.
// DOC:  docs/modules/core.md

// options.canvas    - a <canvas> element or a CSS selector like "#game"
// options.width     - game width in "game pixels" (default 320)
// options.height    - game height in game pixels (default 180)
// options.pixelArt  - true: integer scaling, no smoothing (default false)
// options.fit       - true: grow the canvas to fill its parent element (default true)
export function createCanvas(options = {}) {
  let canvas = options.canvas || "#game";
  if (typeof canvas === "string") canvas = document.querySelector(canvas);
  if (!canvas) throw new Error("createCanvas: no <canvas> found. Add <canvas id=\"game\"></canvas> to the page.");

  const width = options.width || 320;
  const height = options.height || 180;
  const pixelArt = options.pixelArt === true;
  const fit = options.fit !== false;

  const context = canvas.getContext("2d");
  canvas.style.display = "block";
  canvas.style.touchAction = "none";          // stop the browser panning on touch
  if (pixelArt) canvas.style.imageRendering = "pixelated";
  if (!canvas.hasAttribute("tabindex")) canvas.tabIndex = 0;  // so it can take keyboard focus

  // Size the backing store (the real pixels) and the on-screen size.
  //  - Pixel art: draw at exactly width x height; CSS blows it up with hard edges.
  //  - Smooth: draw at (on-screen size x devicePixelRatio) so text and lines stay sharp.
  // Either way, after this, all drawing uses GAME pixels.
  function resize() {
    let scale = 1;
    if (fit) {
      const parent = canvas.parentElement || document.body;
      // clientWidth includes the parent's padding; take it off so we don't overflow.
      const parentStyle = getComputedStyle(parent);
      const padding = parseFloat(parentStyle.paddingLeft) + parseFloat(parentStyle.paddingRight);
      const availableWidth = (parent.clientWidth - padding) || window.innerWidth;
      const availableHeight = Math.max(window.innerHeight - canvas.getBoundingClientRect().top - 8, height);
      scale = Math.min(availableWidth / width, availableHeight / height);
      if (pixelArt && scale >= 1) scale = Math.floor(scale);  // whole numbers keep pixels square
    }
    canvas.style.width = Math.floor(width * scale) + "px";
    canvas.style.height = Math.floor(height * scale) + "px";

    const backingScale = pixelArt ? 1 : scale * (window.devicePixelRatio || 1);
    canvas.width = Math.round(width * backingScale);
    canvas.height = Math.round(height * backingScale);
    // Changing canvas.width resets the context, so set these every time.
    context.setTransform(backingScale, 0, 0, backingScale, 0, 0);
    context.imageSmoothingEnabled = !pixelArt;
  }
  resize();
  window.addEventListener("resize", resize);
  // Stop following the window size (call when the game is removed from the page).
  function destroy() {
    window.removeEventListener("resize", resize);
  }

  // Convert a mouse or touch position (in page pixels) to game pixels.
  function toGamePosition(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    };
  }

  // Clear the whole canvas to a color (or transparent if no color is given).
  function clear(color) {
    if (color) {
      context.fillStyle = color;
      context.fillRect(0, 0, width, height);
    } else {
      context.clearRect(0, 0, width, height);
    }
  }

  return { canvas, context, width, height, pixelArt, resize, toGamePosition, clear, destroy };
}
