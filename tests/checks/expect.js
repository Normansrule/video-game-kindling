// tests/checks/expect.js
// WHAT: Two tiny assertion helpers shared by every check file.
// WHY:  The checks run in the browser AND in Node, so they can't use node:assert.

export function expect(condition, message) {
  if (!condition) throw new Error(message || "expectation failed");
}

export function expectClose(actual, expected, tolerance = 1e-5, label = "value") {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(label + ": expected " + expected + ", got " + actual);
  }
}
