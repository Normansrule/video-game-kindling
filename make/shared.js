// make/shared.js
// WHAT: Small helpers the make/ tools share: safe browser storage, the list of saved
//       characters, copying text, downloading a file, and building a swatch row.
// WHY:  The character designer saves characters and the scene editor offers them as
//       looks, so both must read and write the same list in the same way.

export const CHARACTERS_KEY = "kindling:characters";

// localStorage can be missing or throw (private windows, blocked storage), so every
// read and write is wrapped. Without storage the tools still work; they just forget.
export function readStorage(key, fallback) {
  try {
    const text = localStorage.getItem(key);
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const savedCharacters = () => {
  const list = readStorage(CHARACTERS_KEY, []);
  return Array.isArray(list) ? list.filter((spec) => spec && typeof spec === "object") : [];
};
export const saveCharacters = (list) => writeStorage(CHARACTERS_KEY, list.slice(0, 60));

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers, or no permission: select the text in a hidden box and copy that.
    const box = document.createElement("textarea");
    box.value = text;
    box.style.position = "fixed";
    box.style.opacity = "0";
    document.body.append(box);
    box.select();
    const ok = document.execCommand("copy");
    box.remove();
    return ok;
  }
}

export function downloadFile(name, content, type = "application/json") {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// Ask the user for a file and return its text (resolves null if they cancel).
export function pickTextFile(accept = ".json,application/json") {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", async () => resolve(input.files[0] ? await input.files[0].text() : null));
    input.click();
  });
}

// A row of color buttons plus a free color picker. onPick(hex) runs on every change.
// Returns { element, set(hex) } so the caller can update the selection.
export function swatchRow(label, colors, onPick) {
  const element = document.createElement("div");
  element.className = "ed-swatches";
  element.setAttribute("role", "group");
  element.setAttribute("aria-label", label);
  const buttons = colors.map((hex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ed-swatch";
    button.style.background = hex;
    button.title = hex;
    button.setAttribute("aria-label", label + " " + hex);
    button.addEventListener("click", () => onPick(hex));
    element.append(button);
    return button;
  });
  const picker = document.createElement("input");
  picker.type = "color";
  picker.setAttribute("aria-label", label + ": any color");
  picker.addEventListener("input", () => onPick(picker.value));
  element.append(picker);
  function set(hex) {
    for (const button of buttons) button.setAttribute("aria-pressed", String(button.title === hex));
    picker.value = hex;
  }
  return { element, set };
}

// A row of radio "chips" for a list of choices. onPick(value) runs on change.
let groupCount = 0;
export function chipRow(label, choices, onPick) {
  const element = document.createElement("fieldset");
  element.className = "ed-field";
  const legend = document.createElement("legend");
  legend.textContent = label;
  const row = document.createElement("div");
  row.className = "ed-chips";
  const name = "chips-" + groupCount++;
  const inputs = choices.map((value) => {
    const wrap = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.value = value;
    input.addEventListener("change", () => onPick(value));
    const text = document.createElement("span");
    text.textContent = value;
    wrap.append(input, text);
    row.append(wrap);
    return input;
  });
  element.append(legend, row);
  return { element, set: (value) => inputs.forEach((input) => (input.checked = input.value === value)) };
}
