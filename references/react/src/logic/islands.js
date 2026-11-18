// references/react/src/logic/islands.js   (JavaScript twin: engine/3d/collision3d.js)
// WHAT: The level and the player physics for Crystal islands, as plain data and functions.
//       Boxes are { x, y, z, width, height, depth } with (x, y, z) the minimum corner, +y up.
// WHY:  react-three-fiber components only draw; the rules stay testable in Node.

export const ISLANDS = [
  // [x, top, z, width, depth, color]
  [-4, 0, -4, 8, 8, "#7bd273"], [6, 1, -2, 4, 4, "#5ac0b2"], [12, 2.5, 2, 4, 5, "#7bd273"],
  [6, 3.5, 7, 4, 4, "#eb8c9e"], [-2, 4.5, 9, 5, 4, "#5ac0b2"], [-10, 2, 2, 4, 4, "#eb8c9e"],
  [-11, 4, -7, 5, 4, "#7bd273"], [-2, 6, -12, 4, 4, "#5ac0b2"],
].map(([x, top, z, width, depth, color]) => ({ x, y: top - 0.5, z, width, height: 0.5, depth, color }));

export const CRYSTALS = [
  [2, 1.2, 2], [8, 2.2, 0], [14, 3.7, 4.5], [8, 4.7, 9], [0.5, 5.7, 11], [-8, 3.2, 4], [-8.5, 5.2, -5], [0, 7.2, -10],
];

export const PLAYER_SIZE = { width: 0.7, height: 1, depth: 0.7 };
const GRAVITY = 24;
const JUMP_SPEED = 10;
const RUN_SPEED = 6;

export function createPlayer() {
  return { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, onGround: false, coyote: 0, facing: 0 };
}

export function boxesOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y &&
         a.z < b.z + b.depth && a.z + a.depth > b.z;
}

function playerBox(player) {
  return { x: player.x - PLAYER_SIZE.width / 2, y: player.y, z: player.z - PLAYER_SIZE.depth / 2, ...PLAYER_SIZE };
}

// Move along one axis ("x", "y" or "z"); on a hit, snap to the face. Returns true if hit.
function moveAxis(player, axis, amount, boxes) {
  player[axis] += amount;
  const sizeKey = { x: "width", y: "height", z: "depth" }[axis];
  const half = axis === "y" ? 0 : PLAYER_SIZE[sizeKey] / 2;
  let hit = false;
  for (const box of boxes) {
    if (!boxesOverlap(playerBox(player), box)) continue;
    hit = true;
    player[axis] = amount > 0
      ? box[axis] - (axis === "y" ? PLAYER_SIZE.height : half)
      : box[axis] + box[sizeKey] + half;
  }
  return hit;
}

// input: { moveX (right +), moveZ (forward +), jumpPressed, jumpReleased }, cameraYaw in radians.
export function stepPlayer(player, input, cameraYaw, seconds, boxes = ISLANDS) {
  // Camera-relative movement: forward is "away from the camera".
  const forwardX = -Math.sin(cameraYaw), forwardZ = -Math.cos(cameraYaw);
  const rightX = -forwardZ, rightZ = forwardX;
  let wishX = rightX * input.moveX + forwardX * input.moveZ;
  let wishZ = rightZ * input.moveX + forwardZ * input.moveZ;
  const length = Math.hypot(wishX, wishZ);
  if (length > 1) { wishX /= length; wishZ /= length; }
  const smooth = 1 - Math.pow(0.0001, seconds);
  player.vx += (wishX * RUN_SPEED - player.vx) * smooth;
  player.vz += (wishZ * RUN_SPEED - player.vz) * smooth;
  if (length > 0.1) player.facing = Math.atan2(wishX, wishZ);

  player.coyote = player.onGround ? 0.1 : player.coyote - seconds;
  let jumped = false;
  if (input.jumpPressed && player.coyote > 0) {
    player.vy = JUMP_SPEED;
    player.coyote = 0;
    jumped = true;
  }
  if (input.jumpReleased && player.vy > 3) player.vy *= 0.5;   // short hop
  player.vy -= GRAVITY * seconds;

  if (moveAxis(player, "x", player.vx * seconds, boxes)) player.vx = 0;
  const falling = player.vy < 0;
  player.onGround = false;
  if (moveAxis(player, "y", player.vy * seconds, boxes)) {
    if (falling) player.onGround = true;
    player.vy = 0;
  }
  if (moveAxis(player, "z", player.vz * seconds, boxes)) player.vz = 0;

  let respawned = false;
  if (player.y < -25) {
    Object.assign(player, createPlayer(), { y: 1 });
    respawned = true;
  }
  return { jumped, respawned };
}

// Indices of crystals (from `remaining`) the player is touching.
export function touchedCrystals(player, remaining) {
  return remaining.filter((index) => {
    const [x, y, z] = CRYSTALS[index];
    return Math.hypot(x - player.x, y - (player.y + 0.5), z - player.z) < 1;
  });
}
