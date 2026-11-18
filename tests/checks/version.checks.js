// tests/checks/version.checks.js
// WHAT: Checks for engine/core/version.js, written as plain functions.
// WHY:  The SAME checks run in two places: the browser page tests/index.html and
//       Node's built-in runner (node --test). A check passes if it returns without throwing.
//       Imports here are relative (not "kindling/...") because Node does not read import maps.
// DOC:  docs/RUNNING.md (section "Running the tests")

import { KINDLING_VERSION, describeEngine } from "../../engine/core/version.js";

// A tiny assert helper so the browser needs nothing from Node.
function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export const versionChecks = [
  {
    name: "version looks like major.minor.patch",
    run() {
      expect(/^\d+\.\d+\.\d+$/.test(KINDLING_VERSION), "got " + KINDLING_VERSION);
    },
  },
  {
    name: "describeEngine mentions the version",
    run() {
      expect(describeEngine().includes(KINDLING_VERSION), "version missing from description");
    },
  },
];
