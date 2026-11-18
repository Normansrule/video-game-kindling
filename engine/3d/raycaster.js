// engine/3d/raycaster.js
// WHAT: A "2.5D" raycaster like Wolfenstein 3D (1992): a flat grid map drawn as 3D
//       walls on a 2D canvas, one vertical stripe per screen column. No WebGL needed.
// WHY:  It's the simplest real 3D renderer there is, and it teaches how distance turns
//       into size on screen. Each column casts one ray from the player across the grid
//       using DDA (Digital Differential Analysis): hop from grid line to grid line
//       until a wall is hit, so you never miss a wall and never check a cell twice.
// DOC:  docs/modules/3d.md   VIZ: viz/11-raycaster/
// UNITS: 1 = one grid cell. Angles in radians, 0 = looking along +x (right on the map).

// grid: array of strings, "." = empty, any other character = a wall of that type.
export function isWallAt(grid, column, row) {
  if (row < 0 || row >= grid.length || column < 0 || column >= grid[row].length) return true;
  return grid[row][column] !== ".";
}

// Cast one ray. Returns { distance, column, row, wall, side, hitX, hitY, textureU }.
//   side "x" = hit a wall face that runs north-south, "y" = one that runs east-west.
//   textureU = where along the wall face it hit (0..1), for texturing.
export function castRay(grid, x, y, angle, maxDistance = 64) {
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  let column = Math.floor(x);
  let row = Math.floor(y);

  // How far along the ray to cross one whole cell in x, and in y.
  const crossX = directionX === 0 ? Infinity : Math.abs(1 / directionX);
  const crossY = directionY === 0 ? Infinity : Math.abs(1 / directionY);

  // Which way we step through the grid, and how far to the FIRST grid line on each axis.
  const stepColumn = directionX < 0 ? -1 : 1;
  const stepRow = directionY < 0 ? -1 : 1;
  let nextX = directionX < 0 ? (x - column) * crossX : (column + 1 - x) * crossX;
  let nextY = directionY < 0 ? (y - row) * crossY : (row + 1 - y) * crossY;

  let side = "x";
  let distance = 0;
  while (distance < maxDistance) {
    // Step to whichever grid line is closer.
    if (nextX < nextY) {
      distance = nextX;
      nextX += crossX;
      column += stepColumn;
      side = "x";
    } else {
      distance = nextY;
      nextY += crossY;
      row += stepRow;
      side = "y";
    }
    if (isWallAt(grid, column, row)) {
      const hitX = x + directionX * distance;
      const hitY = y + directionY * distance;
      const along = side === "x" ? hitY : hitX;
      const wall = grid[row] && grid[row][column] ? grid[row][column] : "#";
      return { distance, column, row, wall, side, hitX, hitY, textureU: along - Math.floor(along) };
    }
  }
  return null;
}

// One ray per screen column, spread across the field of view.
// fixFisheye: use the distance straight ahead (perpendicular) instead of along the ray,
// otherwise walls bulge like a fish-eye lens.
export function castRays(grid, player, fieldOfView, rayCount, fixFisheye = true) {
  const hits = [];
  // Spread rays evenly across a flat screen (not evenly by angle) so walls stay straight.
  const halfWidth = Math.tan(fieldOfView / 2);
  for (let i = 0; i < rayCount; i++) {
    const screenX = (2 * (i + 0.5)) / rayCount - 1;         // -1 (left) .. +1 (right)
    const rayAngle = player.angle + Math.atan(screenX * halfWidth);
    const hit = castRay(grid, player.x, player.y, rayAngle);
    if (hit) {
      hit.rayAngle = rayAngle;
      hit.rawDistance = hit.distance;
      if (fixFisheye) hit.distance = hit.distance * Math.cos(rayAngle - player.angle);
    }
    hits.push(hit);
  }
  return hits;
}

// Draw the 3D view onto a 2D context: ceiling, floor, then one stripe per hit.
// options.wallColors: { "#": "#8a8f9c", "1": "#b65", ... }  options.shadeDistance: fog distance
export function drawRaycastView(context, hits, width, height, options = {}) {
  const wallColors = options.wallColors || {};
  const shadeDistance = options.shadeDistance || 12;
  context.fillStyle = options.ceilingColor || "#2a2d3a";
  context.fillRect(0, 0, width, height / 2);
  context.fillStyle = options.floorColor || "#3b3a36";
  context.fillRect(0, height / 2, width, height / 2);

  const stripeWidth = width / hits.length;
  const projectionScale = height * (options.wallHeight || 1);
  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    if (!hit) continue;
    // Twice as far away = half as tall. That's all perspective is.
    const wallHeight = projectionScale / Math.max(hit.distance, 0.0001);
    const top = (height - wallHeight) / 2;
    // Darken: y-side faces a bit (fake lighting), and everything with distance (fog).
    const darkness = (hit.side === "y" ? 0.25 : 0) + Math.min(hit.distance / shadeDistance, 1) * 0.6;
    context.fillStyle = shade(wallColors[hit.wall] || "#9aa0ad", 1 - Math.min(darkness, 0.9));
    // One pixel wider than needed, so neighboring stripes overlap and no gaps show.
    context.fillRect(Math.floor(i * stripeWidth), top, Math.ceil(stripeWidth) + 1, wallHeight);
  }
}

// Multiply a "#rrggbb" color by brightness (0 = black, 1 = unchanged).
export function shade(hexColor, brightness) {
  const red = Math.round(parseInt(hexColor.slice(1, 3), 16) * brightness);
  const green = Math.round(parseInt(hexColor.slice(3, 5), 16) * brightness);
  const blue = Math.round(parseInt(hexColor.slice(5, 7), 16) * brightness);
  return "rgb(" + red + ", " + green + ", " + blue + ")";
}

// Move with collision against the grid: try x and y separately so you slide along walls.
// radius keeps the camera from touching walls (which would make them fill the screen).
export function moveInGrid(grid, player, deltaX, deltaY, radius = 0.2) {
  const newX = player.x + deltaX;
  const edgeX = newX + Math.sign(deltaX) * radius;
  if (!isWallAt(grid, Math.floor(edgeX), Math.floor(player.y))) player.x = newX;
  const newY = player.y + deltaY;
  const edgeY = newY + Math.sign(deltaY) * radius;
  if (!isWallAt(grid, Math.floor(player.x), Math.floor(edgeY))) player.y = newY;
}
