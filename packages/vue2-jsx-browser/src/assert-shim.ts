// Browser-compatible assert shim for @babel/helper-module-imports
const assert = Object.assign(
  function assert(condition: unknown, message?: string): asserts condition {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  },
  {
    ok(condition: unknown, message?: string): asserts condition {
      if (!condition) {
        throw new Error(message || 'Assertion failed');
      }
    },
    strictEqual(actual: unknown, expected: unknown, message?: string): void {
      if (actual !== expected) {
        throw new Error(message || `Expected ${expected} but got ${actual}`);
      }
    },
  }
);

export { assert };
export default assert;
