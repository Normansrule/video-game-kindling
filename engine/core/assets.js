// engine/core/assets.js
// WHAT: Load images, JSON and text files, and wait for all of them before starting.
// WHY:  Drawing an image before it has downloaded draws nothing. Load first, play second.
//       const images = await loadImages({ hero: "hero.png", tiles: "tiles.png" });
// DOC:  docs/modules/core.md
// NOTE: fetch() and images need a web server (python3 -m http.server), not file://.

export function loadImage(url) {
  return new Promise(function (resolve, reject) {
    const image = new Image();
    image.onload = function () {
      resolve(image);
    };
    image.onerror = function () {
      reject(new Error("Could not load image: " + url + " (check the path, and use a local server)"));
    };
    image.src = url;
  });
}

// Load several images at once. Give it { name: url } and get back { name: image }.
export async function loadImages(urlsByName) {
  const names = Object.keys(urlsByName);
  const images = await Promise.all(names.map((name) => loadImage(urlsByName[name])));
  const result = {};
  for (let i = 0; i < names.length; i++) result[names[i]] = images[i];
  return result;
}

export async function loadJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load " + url + " (status " + response.status + ")");
  return response.json();
}

export async function loadText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not load " + url + " (status " + response.status + ")");
  return response.text();
}
