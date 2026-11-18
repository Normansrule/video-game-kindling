// tests/node.test.js
// WHAT: Runs every check in tests/checks/ with Node's built-in test runner.
// WHY:  Same checks as the browser page, but from the terminal and in GitHub Actions.
// RUN:  cd ~/projects/kindling && node --test tests/node.test.js
// DOC:  docs/RUNNING.md

import { test } from "node:test";
import { checkGroups } from "./checks/all.js";

for (const group of checkGroups) {
  for (const check of group.checks) {
    test(group.name + ": " + check.name, () => check.run());
  }
}
