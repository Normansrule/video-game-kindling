// engine/3d/gl.js
// WHAT: Gets a WebGL 2 context from a <canvas>, keeps it sharp and sized to fit,
//       and turns on the settings almost every 3D game wants.
// WHY:  WebGL 2 (Web Graphics Library 2) is the browser's raw door to the graphics card.
//       It draws triangles, nothing more. Everything else in engine/3d builds on it.
// DOC:  docs/modules/3d.md   API: https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext

// options.canvas      element or selector (default "#game")
// options.width/height  the aspect ratio and minimum size in CSS pixels (default 640 x 360)
// options.fit         grow to fill the parent element (default true)
// options.clearColor  [red, green, blue] from 0 to 1 (default dark blue-grey)
export function createGL(options = {}) {
  let canvas = options.canvas || "#game";
  if (typeof canvas === "string") canvas = document.querySelector(canvas);
  if (!canvas) throw new Error("createGL: no <canvas> found.");
  const gl = canvas.getContext("webgl2", { antialias: true });
  if (!gl) throw new Error("This browser or device does not support WebGL 2.");

  const width = options.width || 640;
  const height = options.height || 360;
  const fit = options.fit !== false;
  const clearColor = options.clearColor || [0.08, 0.09, 0.12];
  canvas.style.display = "block";
  canvas.style.touchAction = "none";
  if (!canvas.hasAttribute("tabindex")) canvas.tabIndex = 0;

  // Depth test: nearer triangles hide farther ones (otherwise draw order wins).
  gl.enable(gl.DEPTH_TEST);
  // Back-face culling: skip triangles facing away from the camera (about half of them).
  // Triangles are "front" when their corners go counter-clockwise on screen.
  gl.enable(gl.CULL_FACE);

  function resize() {
    let scale = 1;
    if (fit) {
      const parent = canvas.parentElement || document.body;
      // clientWidth includes the parent's padding; take it off so we don't overflow.
      const parentStyle = getComputedStyle(parent);
      const padding = parseFloat(parentStyle.paddingLeft) + parseFloat(parentStyle.paddingRight);
      const availableWidth = (parent.clientWidth - padding) || window.innerWidth;
      const availableHeight = Math.max(window.innerHeight - canvas.getBoundingClientRect().top - 8, 120);
      scale = Math.min(availableWidth / width, availableHeight / height);
    }
    const cssWidth = Math.floor(width * scale);
    const cssHeight = Math.floor(height * scale);
    canvas.style.width = cssWidth + "px";
    canvas.style.height = cssHeight + "px";
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssWidth * pixelRatio);
    canvas.height = Math.round(cssHeight * pixelRatio);
    // The viewport maps WebGL's -1..1 space onto the canvas pixels.
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener("resize", resize);
  // Stop following the window size (call when the game is removed from the page).
  function destroy() {
    window.removeEventListener("resize", resize);
  }

  function clear() {
    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  // Mouse and touch positions in the same units as width/height (so input modules work).
  function toGamePosition(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    };
  }

  return {
    gl,
    canvas,
    width,
    height,
    resize,
    clear,
    clearColor,
    toGamePosition,
    aspect: () => canvas.width / canvas.height,
    destroy,
  };
}
