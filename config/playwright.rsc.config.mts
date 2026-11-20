import { fileURLToPath } from 'node:url'

import { defineConfig, devices } from '@playwright/test'

import { reserveTestPorts } from './test-ports.mts'

const { rscPort, rscUrl } = await reserveTestPorts()

export default defineConfig({
  testDir: '../tests/rsc',
  outputDir: '../.cache/playwright-rsc/results',
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: { baseURL: rscUrl, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    command: `bun run --cwd tests/fixtures/next build && bun run --cwd tests/fixtures/next start --port ${rscPort}`,
    url: rscUrl,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { NEXT_TELEMETRY_DISABLED: '1' },
  },
})
