import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { testPort } from '../tests/server-urls.ts'
const port = testPort + 3
export default defineConfig({
  testDir: '../tests/rsc',
  outputDir: '../.cache/playwright-rsc/results',
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    command: `bun run --cwd tests/fixtures/next build && bun run --cwd tests/fixtures/next start --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_TELEMETRY_DISABLED: '1' },
  },
})
