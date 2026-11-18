// viz/kit.js
// WHAT: Shared helpers for the visualizations: play/pause, sliders, toggles, selects,
//       theme colors, and a canvas that is sharp on every screen.
// WHY:  Each viz page should only contain the idea it teaches, not 80 lines of UI setup.
//       This is NOT part of the engine; games never import it.
// DOC:  viz/README.md

// Read the current theme colors from CSS so canvases match light and dark mode.
export function themeColors() {
  const style = getComputedStyle(document.documentElement);
  function read(name) {
    return style.getPropertyValue(name).trim();
  }
  return {
    background: read("--surface"),
    text: read("--text"),
    muted: read("--muted"),
    accent: read("--accent"),
    accent2: read("--accent-2"),
    border: read("--border"),
    good: read("--pass"),
    bad: read("--fail"),
  };
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// A canvas with a fixed logical size (in CSS pixels) drawn at full device sharpness.
export function setupCanvas(canvas, width, height) {
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  context.setTransform(scale, 0, 0, scale, 0, 0);
  // Convert a pointer event to logical canvas coordinates.
  function toLocal(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height,
    };
  }
  return { canvas, context, width, height, toLocal };
}

// Runs `tick(seconds)` every animation frame while playing.
// Starts paused if the reader asked the system for reduced motion.
export function createRunner(tick, playButton) {
  let playing = !prefersReducedMotion();
  let lastTime = null;

  function label() {
    if (!playButton) return;
    playButton.textContent = playing ? "Pause" : "Play";
    playButton.setAttribute("aria-pressed", String(playing));
  }

  function frame(now) {
    if (lastTime === null) lastTime = now;
    const seconds = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    tick(playing ? seconds : 0);
    requestAnimationFrame(frame);
  }

  if (playButton) {
    playButton.addEventListener("click", function () {
      playing = !playing;
      label();
    });
  }
  label();
  requestAnimationFrame(frame);

  return {
    isPlaying: () => playing,
    setPlaying(value) {
      playing = value;
      label();
    },
  };
}

// Build controls inside a container element.
export function createControls(container) {
  function addSlider(options) {
    const label = document.createElement("label");
    const title = document.createElement("span");
    const output = document.createElement("output");
    const input = document.createElement("input");
    input.type = "range";
    input.min = options.min;
    input.max = options.max;
    input.step = options.step || 1;
    input.value = options.value;
    const unit = options.unit || "";
    function show() {
      output.textContent = " " + input.value + unit;
      if (options.onChange) options.onChange(Number(input.value));
    }
    input.addEventListener("input", show);
    title.textContent = options.label;
    title.appendChild(output);
    label.append(title, input);
    container.appendChild(label);
    show();
    return input;
  }

  function addToggle(text, initial, onChange) {
    const label = document.createElement("label");
    label.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = initial;
    input.addEventListener("change", () => onChange(input.checked));
    label.append(input, document.createTextNode(text));
    container.appendChild(label);
    onChange(initial);
    return input;
  }

  function addSelect(text, choices, initial, onChange) {
    const label = document.createElement("label");
    const select = document.createElement("select");
    for (const choice of choices) {
      const option = document.createElement("option");
      option.value = choice;
      option.textContent = choice;
      select.appendChild(option);
    }
    select.value = initial;
    select.addEventListener("change", () => onChange(select.value));
    label.append(document.createTextNode(text), select);
    container.appendChild(label);
    onChange(initial);
    return select;
  }

  function addButtons(buttonList) {
    const row = document.createElement("div");
    row.className = "row";
    const made = [];
    for (const item of buttonList) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "control" + (item.primary ? " primary" : "");
      button.textContent = item.label;
      if (item.onClick) button.addEventListener("click", item.onClick);
      row.appendChild(button);
      made.push(button);
    }
    container.appendChild(row);
    return made;
  }

  return { addSlider, addToggle, addSelect, addButtons };
}

// Draw text with a consistent font. size is in logical pixels.
export function label(context, text, x, y, color, size = 13, align = "left") {
  context.fillStyle = color;
  context.font = size + "px system-ui, sans-serif";
  context.textAlign = align;
  context.textBaseline = "middle";
  context.fillText(text, x, y);
}
