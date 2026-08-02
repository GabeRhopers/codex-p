import { defineConfig } from 'vitest/config';

// A deliberately separate config from vite.config.ts's `test` block (whose
// `include: ['tests/**/*.test.ts']` is what `npm test` and CI's `verify`
// job run on every push). The balance report below is a diagnostic tool a
// human runs on demand after a content change, not a pass/fail regression
// gate — it has no fixed "correct" output to assert against, and
// simulating ~150 full matches is too slow to want on every push. Keeping
// it on a separate config/glob (`*.report.ts`, not `*.test.ts`) is what
// keeps it out of the default `vitest run` entirely.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/balance/**/*.report.ts'],
    testTimeout: 120_000,
  },
});
