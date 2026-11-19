// engine/world/blocks.js
// WHAT: The list of block types a world can be built from: their names, which
//       texture goes on the top, sides and bottom, and whether you can walk through
//       or see through them.
// WHY:  A world is just a big 3D array of small numbers (0 = air, 1 = grass...).
//       This table turns each number into meaning. Every view (2D map, isometric,
//       raycaster, 3D) reads the same table, so a world looks the same in all four.
// DOC:  docs/modules/world.md (section "Blocks")
//
// To add a block: add a texture painter in world/textures-extra.js, then a line below
// and a name in BLOCK.
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
  COBBLE: 15,
  MOSSY_COBBLE: 16,
  GRAVEL: 17,
  CLAY: 18,
  ICE: 19,
  LAVA: 20,
  GOLD_ORE: 21,
  CRYSTAL: 22,
  STONE_BRICKS: 23,
  MARBLE: 24,
  OBSIDIAN: 25,
  CACTUS: 26,
  PUMPKIN: 27,
  BOOKSHELF: 28,
  HAY: 29,
  DARK_PLANKS: 30,
  BIRCH_LOG: 31,
  WOOL_RED: 32,
  WOOL_BLUE: 33,
  WOOL_YELLOW: 34,
  WOOL_WHITE: 35,
  WOOL_GREEN: 36,
  METAL: 37,
  RED_SAND: 38,
  AUTUMN_LEAVES: 39,
  GLOW_STONE: 40,
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
  // Kindling 2.1: the bigger palette (textures in textures-extra.js).
  { id: 15, name: "cobblestone", top: "cobble", side: "cobble", bottom: "cobble", solid: true },
  { id: 16, name: "mossy cobblestone", top: "mossy_cobble", side: "mossy_cobble", bottom: "cobble", solid: true },
  { id: 17, name: "gravel", top: "gravel", side: "gravel", bottom: "gravel", solid: true },
  { id: 18, name: "clay", top: "clay", side: "clay", bottom: "clay", solid: true },
  { id: 19, name: "ice", top: "ice", side: "ice", bottom: "ice", solid: true },
  { id: 20, name: "lava", top: "lava", side: "lava", bottom: "lava", solid: true, glow: 1 },
  { id: 21, name: "gold ore", top: "gold_ore", side: "gold_ore", bottom: "gold_ore", solid: true },
  { id: 22, name: "crystal", top: "crystal_block", side: "crystal_block", bottom: "crystal_block", solid: true, glow: 1 },
  { id: 23, name: "stone bricks", top: "stone_bricks", side: "stone_bricks", bottom: "stone_bricks", solid: true },
  { id: 24, name: "marble", top: "marble", side: "marble_pillar", bottom: "marble", solid: true },
  { id: 25, name: "obsidian", top: "obsidian", side: "obsidian", bottom: "obsidian", solid: true },
  { id: 26, name: "cactus", top: "cactus_top", side: "cactus_side", bottom: "cactus_top", solid: true },
  { id: 27, name: "pumpkin", top: "pumpkin_top", side: "pumpkin_side", bottom: "pumpkin_top", solid: true },
  { id: 28, name: "bookshelf", top: "planks", side: "bookshelf", bottom: "planks", solid: true },
  { id: 29, name: "hay", top: "hay_top", side: "hay_side", bottom: "hay_top", solid: true },
  { id: 30, name: "dark planks", top: "dark_planks", side: "dark_planks", bottom: "dark_planks", solid: true },
  { id: 31, name: "birch log", top: "log_top", side: "birch_side", bottom: "log_top", solid: true },
  { id: 32, name: "red wool", top: "wool_red", side: "wool_red", bottom: "wool_red", solid: true },
  { id: 33, name: "blue wool", top: "wool_blue", side: "wool_blue", bottom: "wool_blue", solid: true },
  { id: 34, name: "yellow wool", top: "wool_yellow", side: "wool_yellow", bottom: "wool_yellow", solid: true },
  { id: 35, name: "white wool", top: "wool_white", side: "wool_white", bottom: "wool_white", solid: true },
  { id: 36, name: "green wool", top: "wool_green", side: "wool_green", bottom: "wool_green", solid: true },
  { id: 37, name: "metal", top: "metal", side: "metal", bottom: "metal", solid: true },
  { id: 38, name: "red sand", top: "red_sand", side: "red_sand", bottom: "red_sand", solid: true },
  { id: 39, name: "autumn leaves", top: "autumn_leaves", side: "autumn_leaves", bottom: "autumn_leaves", solid: true },
  { id: 40, name: "glow stone", top: "glow_stone", side: "glow_stone", bottom: "glow_stone", solid: true, glow: 1 },
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
