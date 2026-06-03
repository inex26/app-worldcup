import { defineConfig, configDefaults } from "vitest/config";

// Keep the Playwright e2e specs out of the unit-test run — vitest's default
// include matches `*.spec.ts`, which would otherwise try to execute them.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});
