// tests/checks/all.js
// WHAT: The list of every check group. Add new check files here.
// WHY:  tests/index.html (browser) and tests/node.test.js (Node) both read this list,
//       so a check added once runs in both places.

import { versionChecks } from "./version.checks.js";
import { mathChecks } from "./math.checks.js";
import { coreChecks } from "./core.checks.js";
import { twoDChecks } from "./2d.checks.js";
import { threeDChecks } from "./3d.checks.js";
import { tinyChecks } from "./tiny.checks.js";
import { toolsChecks } from "./tools.checks.js";
import { worldChecks } from "./world.checks.js";

export const checkGroups = [
  { name: "version", checks: versionChecks },
  { name: "math", checks: mathChecks },
  { name: "core", checks: coreChecks },
  { name: "2d", checks: twoDChecks },
  { name: "3d", checks: threeDChecks },
  { name: "tiny", checks: tinyChecks },
  { name: "tools", checks: toolsChecks },
  { name: "world", checks: worldChecks },
];
