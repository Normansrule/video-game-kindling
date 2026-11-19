// tests/checks/library.checks.js
// WHAT: Checks for the art library: every tile, sprite and block texture is painted,
//       sized right and named once; sprite rows only use palette letters.
// WHY:  The library is big and grows by hand. A typo in one row of a sprite, or two
//       tiles with the same name, should fail here and not on someone's game page.
// DOC:  docs/modules/library.md

import { expect } from "./expect.js";
import { tileCatalog, tileNames, tileCategories, tileInfo, tilePixels, TILE_SIZE, isOverlayTile } from "../../engine/library/tiles.js";
import { SPRITE_ART, PALETTE } from "../../engine/library/sprite-art.js";
import { spriteNames, spritePixels, spriteInfo } from "../../engine/library/sprites.js";
import { pixelsFromRows, flipPixels, getPixel, outlinePixels, createPixels, setPixel } from "../../engine/library/pixels.js";
import { blockTypes, textureNames, BLOCK } from "../../engine/world/blocks.js";
import { paintTexture } from "../../engine/world/textures.js";

// How many pixels of an image are not fully see-through.
const solidPixels = (image) => { let count = 0; for (let i = 3; i < image.data.length; i += 4) if (image.data[i] > 0) count++; return count; };

export const libraryChecks = [
  {
    name: "tile names are unique and every tile has a known category",
    run() {
      expect(tileCatalog.length >= 90, "expected at least 90 tiles, got " + tileCatalog.length);
      expect(new Set(tileNames).size === tileNames.length, "two tiles share a name");
      for (const tile of tileCatalog) expect(tileCategories.includes(tile.category), tile.name + " has unknown category " + tile.category);
    },
  },
  {
    name: "every tile paints 16 x 16 pixels, and ground tiles cover the whole cell",
    run() {
      for (const name of tileNames) {
        const image = tilePixels(name);
        expect(image.width === TILE_SIZE && image.height === TILE_SIZE, name + " is not 16 x 16");
        expect(solidPixels(image) > 20, name + " is almost empty");
        if (!isOverlayTile(name)) expect(solidPixels(image) === 256, name + " is a full tile but has see-through pixels");
      }
    },
  },
  {
    name: "tile flags make sense: one-way tiles are solid, unknown tiles return null",
    run() {
      for (const tile of tileCatalog) if (tileInfo(tile.name).oneWay) expect(tileInfo(tile.name).solid, tile.name + " is one-way but not solid");
      expect(tileInfo("no_such_tile") === null || tileInfo("no_such_tile") === undefined, "unknown tile should have no info");
      expect(tileInfo("lava").hurts && tileInfo("ladder").climb && tileInfo("flag").goal, "lava hurts, ladders climb, flags are goals");
    },
  },
  {
    name: "sprite rows are even and use only palette letters",
    run() {
      expect(spriteNames.length >= 30, "expected at least 30 sprites");
      for (const name of spriteNames) {
        for (const frame of SPRITE_ART[name].frames) {
          const width = frame[0].length;
          for (const row of frame) {
            expect(row.length === width, name + ": rows have different lengths");
            for (const letter of row) expect(letter === "." || PALETTE[letter], name + ": unknown palette letter '" + letter + "'");
          }
        }
        expect(solidPixels(spritePixels(name)) > 10, name + " is almost empty");
        expect(spriteInfo(name).frameCount === SPRITE_ART[name].frames.length, name + " frame count");
      }
    },
  },
  {
    name: "pixel helpers: rows, flip and outline",
    run() {
      const image = pixelsFromRows(["ab", ".."], { a: "#ff0000", b: "#0000ff" });
      expect(getPixel(image, 0, 0)[0] === 255 && getPixel(image, 1, 1)[3] === 0, "pixelsFromRows colors");
      expect(getPixel(flipPixels(image), 0, 0)[2] === 255, "flip moves the blue pixel to the left");
      const dot = createPixels(3, 3);
      setPixel(dot, 1, 1, "#ffffff");
      const outlined = outlinePixels(dot, "#000000");
      expect(getPixel(outlined, 1, 0)[3] === 255 && getPixel(outlined, 0, 0)[3] === 0, "outline touches sides, not corners");
    },
  },
  {
    name: "every block names textures that exist and paint",
    run() {
      expect(blockTypes.length >= 40, "expected at least 40 blocks");
      expect(BLOCK.GLOW_STONE && BLOCK.LAVA && BLOCK.WOOL_RED, "new block ids exist");
      for (const type of blockTypes.slice(1)) {
        for (const face of ["top", "side", "bottom"]) expect(textureNames.includes(type[face]), type.name + " " + face + " texture is missing");
      }
      for (const name of textureNames) {
        const texture = paintTexture(name);
        expect(texture.data.length === 16 * 16 * 4, name + " texture size");
      }
    },
  },
];
