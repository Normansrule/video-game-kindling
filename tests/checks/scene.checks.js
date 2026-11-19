// tests/checks/scene.checks.js
// WHAT: Checks for characters (spec, random, 3D parts, 2D frames) and scenes (tiles,
//       fill, resize, entities, save and load, repairing broken files, prefabs).
// WHY:  The character designer, the scene editor and the games all share these data
//       formats. If the format breaks, every saved character and scene breaks with it.
// DOC:  docs/modules/characters.md, docs/modules/scene.md

import { expect } from "./expect.js";
import { windingMismatches } from "./world.checks.js";
import { defaultCharacter, normalizeCharacter, randomCharacter, CHARACTER_OPTIONS } from "../../engine/characters/character-spec.js";
import { characterParts } from "../../engine/characters/character-model.js";
import { characterFrame, FRAME_WIDTH, FRAME_HEIGHT } from "../../engine/characters/character-sprite.js";
import { createScene, setTile, getTile, fillTiles, resizeScene, addEntity, removeEntity, parseScene, stringifyScene } from "../../engine/scene/scene.js";
import { COMPONENTS, normalizeComponent, componentDefaults } from "../../engine/scene/components.js";
import { PREFABS, PREFAB_NAMES, createEntity } from "../../engine/scene/prefabs.js";
import { spriteNames } from "../../engine/library/sprites.js";

export const sceneChecks = [
  {
    name: "normalizeCharacter repairs bad input and keeps good input",
    run() {
      const fixed = normalizeCharacter({ skin: "red", hat: "crown", height: 9, hairStyle: "mohawk", name: "  Ada  " });
      expect(fixed.skin === defaultCharacter().skin, "invalid color falls back to the default");
      expect(fixed.hat === "crown" && fixed.hairStyle === defaultCharacter().hairStyle, "valid choice kept, invalid replaced");
      expect(fixed.height === 1.2 && fixed.name === "Ada", "height clamped, name trimmed");
    },
  },
  {
    name: "randomCharacter is the same for the same seed",
    run() {
      expect(JSON.stringify(randomCharacter(7)) === JSON.stringify(randomCharacter(7)), "seed 7 differs between calls");
      expect(JSON.stringify(randomCharacter(7)) !== JSON.stringify(randomCharacter(8)), "seeds 7 and 8 give the same character");
    },
  },
  {
    name: "every hat, hair, shirt, back and held item builds a 3D model that faces outward",
    run() {
      for (const field in CHARACTER_OPTIONS) {
        for (const value of CHARACTER_OPTIONS[field]) {
          const parts = characterParts({ ...defaultCharacter(), [field]: value });
          for (const name in parts) {
            expect(parts[name].data.positions.length > 0, field + "=" + value + ": " + name + " is empty");
            expect(windingMismatches(parts[name].data) === 0, field + "=" + value + ": " + name + " has inside-out triangles");
          }
        }
      }
    },
  },
  {
    name: "2D frames are 16 x 20 in every direction, and left mirrors right",
    run() {
      const spec = randomCharacter(3);
      for (const direction of ["down", "up", "right", "left"]) {
        const frame = characterFrame(spec, direction, 1);
        expect(frame.width === FRAME_WIDTH && frame.height === FRAME_HEIGHT, direction + " frame size");
      }
      const right = characterFrame(spec, "right", 0), left = characterFrame(spec, "left", 0);
      const at = (image, x, y) => image.data.slice((y * image.width + x) * 4, (y * image.width + x) * 4 + 4).join();
      expect(at(right, 4, 8) === at(left, FRAME_WIDTH - 5, 8), "left is not the mirror of right");
    },
  },
  {
    name: "scene tiles: set, get, flood fill and resize",
    run() {
      const scene = createScene({ width: 10, height: 6 });
      expect(setTile(scene, "main", 2, 3, "grass_block") === true, "first set changes the cell");
      expect(setTile(scene, "main", 2, 3, "grass_block") === false, "same tile again changes nothing");
      expect(getTile(scene, "main", 2, 3) === "grass_block" && getTile(scene, "main", 99, 3) === "", "get inside and outside");
      expect(fillTiles(scene, "back", 0, 0, "water") === 60, "fill an empty layer covers all 60 cells");
      resizeScene(scene, 12, 4);
      expect(scene.layers.main.length === 4 && scene.layers.main[0].length === 12, "resize rows and columns");
      let threw = false;
      try { setTile(scene, "main", 0, 0, "not_a_tile"); } catch { threw = true; }
      expect(threw, "unknown tile names are refused");
    },
  },
  {
    name: "scenes survive save and load, and broken files are repaired",
    run() {
      const scene = createScene({ width: 8, height: 4, template: "topdown" });
      setTile(scene, "main", 1, 1, "stone_wall");
      const slime = addEntity(scene, "slime", 32, 16);
      addEntity(scene, "coin", 48, 16);
      removeEntity(scene, slime.id);
      const loaded = parseScene(stringifyScene(scene));
      expect(loaded.template === "topdown" && getTile(loaded, "main", 1, 1) === "stone_wall", "tiles and template kept");
      expect(loaded.entities.length === 1 && loaded.entities[0].prefab === "coin", "entities kept");
      const repaired = parseScene({ format: "kindling-scene", width: 3, height: 2, legend: { a: "nope", b: "dirt" }, layers: { main: ["ab"] }, entities: [{ x: 1 }, { x: 1, y: 2, components: { patrol: { speed: 9999 }, magic: {} } }] });
      expect(getTile(repaired, "main", 0, 0) === "" && getTile(repaired, "main", 1, 0) === "dirt", "unknown tile dropped, known kept");
      expect(repaired.entities.length === 1, "entity without y dropped");
      expect(repaired.entities[0].components.patrol.speed === COMPONENTS.patrol.fields.speed.max && !repaired.entities[0].components.magic, "component clamped, unknown component dropped");
    },
  },
  {
    name: "every prefab builds an entity with valid components and sprites",
    run() {
      expect(PREFAB_NAMES.length >= 20, "expected at least 20 prefabs");
      for (const name of PREFAB_NAMES) {
        const entity = createEntity(name, 0, 0, 1);
        for (const component in entity.components) {
          expect(COMPONENTS[component], name + " uses unknown component " + component);
          expect(JSON.stringify(normalizeComponent(component, entity.components[component])) === JSON.stringify(entity.components[component]), name + "." + component + " is not normalized");
        }
        const image = entity.components.sprite && entity.components.sprite.image;
        expect(!image || image === "character" || image.startsWith("tile:") || spriteNames.includes(image), name + " uses unknown sprite " + image);
        expect(PREFABS[name].size.length === 2, name + " needs a size");
      }
      expect(componentDefaults("player").lives === 3, "player defaults");
    },
  },
];
