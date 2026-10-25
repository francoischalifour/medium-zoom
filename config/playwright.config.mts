import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))

export default defineConfig({
  testDir: '../tests/browser',
  outputDir: '../.cache/playwright/results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../.cache/playwright/report' }]],
  use: { baseURL: 'http://127.0.0.1:4175', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', testIgnore: '**/mobile.spec.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testIgnore: '**/mobile.spec.ts', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testIgnore: '**/mobile.spec.ts', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chromium', testMatch: '**/mobile.spec.ts', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-webkit', testMatch: '**/mobile.spec.ts', use: { ...devices['iPhone 13'] } },
  ],
  webServer: [
    {
      cwd: repositoryRoot,
      command: 'bun tests/server.ts',
      url: 'http://127.0.0.1:4175',
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      cwd: repositoryRoot,
      command: 'bun run dev:example svelte --port 4176',
      url: 'http://127.0.0.1:4176/examples/svelte/',
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
})
