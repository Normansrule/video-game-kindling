// engine/world/blocks.js
// WHAT: The list of block types a world can be built from: their names, which
//       texture goes on the top, sides and bottom, and whether you can walk through
//       or see through them.
// WHY:  A world is just a big 3D array of small numbers (0 = air, 1 = grass...).
//       This table turns each number into meaning. Every view (2D map, isometric,
//       raycaster, 3D) reads the same table, so a world looks the same in all four.
// DOC:  docs/modules/world.md (section "Blocks")
//
// To add a block: add a texture painter in world/textures.js, then a line below.
// Keep ids below 256 (the world stores them in a Uint8Array).

export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  LOG: 5,
  LEAVES: 6,
  WATER: 7,
  PLANKS: 8,
  BRICK: 9,
  SNOW: 10,
  LANTERN: 11,
  ROOF: 12,
  PATH: 13,
  FLOWERS: 14,
};

// top / side / bottom: texture names from world/textures.js.
// solid:       blocks movement (players, raycaster walls).
// transparent: you can see neighbors through it, so their faces must still be drawn.
// liquid:      drawn in the see-through water pass, slightly lower than a full block.
// glow:        0..1, how much it lights itself (lanterns stay bright at night).
export const blockTypes = [
  { id: 0, name: "air", solid: false, transparent: true },
  { id: 1, name: "grass", top: "grass_top", side: "grass_side", bottom: "dirt", solid: true },
  { id: 2, name: "dirt", top: "dirt", side: "dirt", bottom: "dirt", solid: true },
  { id: 3, name: "stone", top: "stone", side: "stone", bottom: "stone", solid: true },
  { id: 4, name: "sand", top: "sand", side: "sand", bottom: "sand", solid: true },
  { id: 5, name: "log", top: "log_top", side: "log_side", bottom: "log_top", solid: true },
  { id: 6, name: "leaves", top: "leaves", side: "leaves", bottom: "leaves", solid: true },
  { id: 7, name: "water", top: "water", side: "water", bottom: "water", solid: false, transparent: true, liquid: true },
  { id: 8, name: "planks", top: "planks", side: "planks", bottom: "planks", solid: true },
  { id: 9, name: "brick", top: "brick", side: "brick", bottom: "brick", solid: true },
  { id: 10, name: "snow", top: "snow", side: "snow_side", bottom: "dirt", solid: true },
  { id: 11, name: "lantern", top: "lantern", side: "lantern", bottom: "lantern", solid: true, glow: 1 },
  { id: 12, name: "roof", top: "roof", side: "roof", bottom: "planks", solid: true },
  { id: 13, name: "path", top: "path", side: "dirt", bottom: "dirt", solid: true },
  { id: 14, name: "flowers", top: "flowers", side: "grass_side", bottom: "dirt", solid: true },
];

// Every texture name used above, in a fixed order. The 3D view stores the textures
// as layers of one "texture array" in exactly this order, so layer number = index here.
export const textureNames = [];
for (const type of blockTypes) {
  for (const face of [type.top, type.side, type.bottom]) {
    if (face && !textureNames.includes(face)) textureNames.push(face);
  }
}

export function blockType(id) {
  return blockTypes[id] || blockTypes[0];
}

export function isSolid(id) {
  return blockType(id).solid === true;
}

export function isTransparent(id) {
  return blockType(id).transparent === true;
}

// Which texture layer to use for one face. face: "top", "side" or "bottom".
export function textureLayer(id, face) {
  const type = blockType(id);
  return textureNames.indexOf(type[face]);
}
