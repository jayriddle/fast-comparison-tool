import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,  // Increased for slower load/animation timing in current build
  retries: process.env.CI ? 2 : 1,  // Allow 1 retry locally for flaky timing
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npx serve -l 8080 --no-clipboard .',
    port: 8080,
    reuseExistingServer: true,  // Use our existing background server on 8080
  },
});
