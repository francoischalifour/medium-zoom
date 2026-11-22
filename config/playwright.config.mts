import { fileURLToPath } from 'node:url'

import { defineConfig, devices } from '@playwright/test'

import { reserveTestPorts } from '../tests/server-urls.ts'
import { chromium } from './playwright-chromium.mts'

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
const { testUrl, sveltePort, svelteDevUrl, shadcnPort, shadcnDevUrl, rscUrl } =
  await reserveTestPorts()
const mobileSpecs = [
  'mobile',
  'dialog',
  'gallery',
  'gallery-composition',
  'gallery-controller',
  'gallery-gestures',
  'gallery-stress',
  'gallery-transitions',
  'frames',
  'strategies',
  'triggers',
].map(name => `**/${name}.spec.ts`)

export default defineConfig({
  testDir: '../tests/browser',
  outputDir: '../.cache/playwright/results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../.cache/playwright/report' }],
  ],
  use: { baseURL: testUrl, trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/mobile.spec.ts',
      use: chromium(devices['Desktop Chrome']),
    },
    {
      name: 'modern-chromium',
      testMatch: ['**/api.spec.ts', '**/loading.spec.ts', '**/motion.spec.ts'],
      metadata: { preset: 'modern' },
      use: chromium(devices['Desktop Chrome']),
    },
    {
      name: 'firefox',
      testIgnore: '**/mobile.spec.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: '**/mobile.spec.ts',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chromium',
      testMatch: mobileSpecs,
      use: chromium(devices['Pixel 7']),
    },
    {
      // A slow phone: sparse, late events and long frames.
      name: 'slow-mobile-chromium',
      testMatch: ['**/gallery-gestures.spec.ts', '**/gallery-stress.spec.ts'],
      metadata: { cpuThrottle: 6 },
      use: chromium(devices['Pixel 7']),
    },
    {
      name: 'mobile-webkit',
      testMatch: mobileSpecs,
      use: { ...devices['iPhone 13'] },
    },
    {
      // React Server Components in a Next.js app built on the packed library.
      name: 'rsc',
      testDir: '../tests/rsc',
      workers: 1,
      use: { ...chromium(devices['Desktop Chrome']), baseURL: rscUrl },
    },
    {
      name: 'analytics',
      testDir: '../tests/analytics',
      // Clipboard permissions and focus are shared by the browser process.
      workers: 1,
      use: chromium(devices['Desktop Chrome']),
    },
  ],
  webServer: [
    {
      cwd: repositoryRoot,
      command: 'bun tests/server.ts',
      url: testUrl,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      cwd: repositoryRoot,
      command: `bun run dev:example svelte --port ${sveltePort}`,
      url: svelteDevUrl,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      cwd: repositoryRoot,
      command: `bun run dev:example shadcn --port ${shadcnPort}`,
      url: shadcnDevUrl,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
})
