import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // This repo's dev sandbox pre-installs Chromium at a fixed path
        // and skips Playwright's own browser download; real CI runners
        // (and any other machine) have no such path and must fall back to
        // Playwright's normally-installed browser instead.
        launchOptions: process.env.PLAYWRIGHT_BROWSERS_PATH
          ? { executablePath: '/opt/pw-browsers/chromium' }
          : {},
      },
    },
  ],
});
