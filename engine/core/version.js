// engine/core/version.js
// WHAT: The engine's version number and a one-line description.
// WHY:  It is the smallest possible engine module. Every page imports it through
//       the import map ("kindling/core/version.js"), so if a page shows the version,
//       the import map works on that page. It is also the version shown on the landing page.
// DOC:  docs/RUNNING.md (how pages find the engine) and docs/DECISIONS.md (D1).

export const KINDLING_VERSION = "2.0.0";

// Returns a short sentence for status lines, the landing page and tests.
export function describeEngine() {
  return "Kindling " + KINDLING_VERSION + " (zero dependencies, plain JavaScript)";
}
