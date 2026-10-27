import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

import { createServer } from 'vite'

import { test, expect } from './website-fixture'

// Both journeys use the shared package output; avoid overlapping rebuilds.
test.describe.configure({ mode: 'default' })

test('website development loads library source instead of the built ES module', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Development module resolution is shared tooling.')
  const bundle = resolve('dist/medium-zoom.esm.js')
  const source = resolve('src/index.js')
  let loadedLibrarySource = false
  const server = await createServer({
    configFile: resolve('config/vite.website.config.mts'),
    server: { host: '127.0.0.1', port: 0, strictPort: true },
    logLevel: 'silent',
    clearScreen: false,
    plugins: [
      {
        name: 'verify-library-source',
        enforce: 'pre',
        load(id) {
          const path = id.split('?')[0]
          if (path === bundle) {
            throw new Error('Website development must not load the built ES module')
          }
          if (path === source) {
            loadedLibrarySource = true
          }
        },
      },
    ],
  })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await server.listen()
    await page.goto(new URL('docs/guides/styling/', server.resolvedUrls!.local[0]).href)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Styling')
    const trigger = page.locator('.docs-preview [data-slot="image-zoom-trigger"]')
    await trigger.click()
    await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
    await page.keyboard.press('Escape')
    await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
    await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
    expect(loadedLibrarySource).toBe(true)
  } finally {
    await server.close()
  }
})

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
