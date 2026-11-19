// engine/scene/prefabs.js
// WHAT: Ready-made entities ("prefabs", as Unity calls them): the player, coins, gems,
//       keys, hearts, enemies that patrol, chase or fly, villagers who talk, springs,
//       locked doors and the goal flag. Each is a list of components with settings.
// WHY:  Drop a prefab into a scene and it already works. Then change any setting in
//       the inspector, or add and remove components, to make it your own.
// DOC:  docs/modules/scene.md (section "Prefabs")

import { componentDefaults, normalizeComponent } from "./components.js";

const enemy = (image, extra) => ({ category: "enemy", size: [12, 10], components: { sprite: { image }, body: { width: 12, height: 10 }, hurt: {}, ...extra } });

export const PREFABS = {
  player: { category: "player", size: [10, 18], components: { sprite: { image: "character" }, body: { width: 10, height: 18 }, player: {} } },
  coin: { category: "pickup", size: [12, 12], components: { sprite: { image: "coin" }, collectible: { kind: "coin", value: 1 } } },
  gem: { category: "pickup", size: [12, 12], components: { sprite: { image: "gem" }, collectible: { kind: "gem", value: 5 } } },
  star: { category: "pickup", size: [12, 12], components: { sprite: { image: "star" }, collectible: { kind: "star", value: 10 } } },
  heart: { category: "pickup", size: [12, 12], components: { sprite: { image: "heart" }, collectible: { kind: "heart", value: 1 } } },
  key: { category: "pickup", size: [12, 12], components: { sprite: { image: "key" }, collectible: { kind: "key", value: 1 } } },
  potion: { category: "pickup", size: [12, 12], components: { sprite: { image: "potion_red" }, collectible: { kind: "heart", value: 2 } } },
  slime: enemy("slime", { patrol: { speed: 25 } }),
  blue_slime: enemy("slime_blue", { patrol: { speed: 45 } }),
  frog: enemy("frog", { patrol: { speed: 35, turnAtLedges: false } }),
  skeleton: enemy("skeleton", { chase: { speed: 35, range: 90 }, hurt: { stompable: false } }),
  spider: enemy("spider", { chase: { speed: 55, range: 70 } }),
  bat: enemy("bat", { body: { width: 12, height: 8, gravity: false }, fly: { amplitude: 12, speed: 3 }, patrol: { speed: 30, turnAtLedges: false } }),
  ghost: enemy("ghost", { body: { width: 12, height: 12, gravity: false }, fly: { amplitude: 6, speed: 1.5 }, chase: { speed: 25, range: 120 }, hurt: { stompable: false } }),
  bee: enemy("bee", { body: { width: 10, height: 8, gravity: false }, fly: { amplitude: 4, speed: 6 }, chase: { speed: 45, range: 60 } }),
  villager: { category: "npc", size: [10, 18], components: { sprite: { image: "character" }, body: { width: 10, height: 18 }, dialog: { text: "Welcome to our village!" }, player: null } },
  spring: { category: "object", size: [12, 6], components: { sprite: { image: "puff" }, spring: {} } },
  locked_door: { category: "object", size: [16, 16], components: { sprite: { image: "tile:door_locked" }, door: {} } },
  goal_flag: { category: "object", size: [16, 16], components: { sprite: { image: "tile:flag" }, goal: {} } },
  chest: { category: "object", size: [16, 16], components: { sprite: { image: "tile:chest" }, collectible: { kind: "gem", value: 20 } } },
};

export const PREFAB_NAMES = Object.keys(PREFABS);

// A new entity from a prefab, with every component's settings filled in.
// The villager's "character" sprite needs a look: we give it a random seed by id.
export function createEntity(prefabName, x, y, id) {
  const prefab = PREFABS[prefabName];
  if (!prefab) throw new Error("Unknown prefab '" + prefabName + "'");
  const components = {};
  for (const name in prefab.components) {
    if (prefab.components[name] === null) continue;
    components[name] = normalizeComponent(name, { ...componentDefaults(name), ...prefab.components[name] });
  }
  const label = prefabName.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
  const entity = { id, name: label, prefab: prefabName, x, y, components };
  if (prefabName === "villager") entity.look = { seed: id * 7 + 3 };
  return entity;
}
