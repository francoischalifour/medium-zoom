import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { testUrl } from '../tests/server-urls.ts'

export default defineConfig({
  testDir: '../tests/analytics',
  outputDir: '../.cache/playwright-analytics/results',
  workers: 1, // Clipboard permissions and focus are shared by the browser process.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: { baseURL: testUrl, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    command: 'bun scripts/build-analytics-fixture.ts && bun tests/server.ts',
    url: testUrl,
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
