import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

import { createServer } from 'vite'

import { test, expect } from './website-fixture'

test('production prerendering preserves a running development site and its hydration', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'The cache is shared tooling, independent of browser engine.'
  )
  const server = await createServer({
    configFile: resolve('config/vite.website.config.mts'),
    server: { host: '127.0.0.1', port: 0, strictPort: true },
    logLevel: 'silent',
    clearScreen: false,
  })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await server.listen()
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto(server.resolvedUrls!.local[0])
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // This builds and prerenders a separate artifact while development remains open.
    await promisify(execFile)('bun', ['scripts/build-analytics-fixture.ts'])
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('.monthly-downloads a')).toContainText('monthly downloads on npm')
    await page.getByRole('button', { name: 'Switch to dark theme' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    expect(errors).toEqual([])
  } finally {
    await server.close()
  }
})
