import { defineConfig, configDefaults } from "vitest/config";

// Unit tests are `*.test.ts` (run by vitest). The `tests/e2e` Playwright specs use Playwright's own
// `test()` runner — exclude them here so `npm run test` doesn't try to collect them (it would fail
// with "Playwright Test did not expect test() to be called here"). They run via `npm run test:e2e`.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});
