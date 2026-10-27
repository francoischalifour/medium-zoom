import { execFile } from 'node:child_process'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

import { createServer } from 'vite'

import { test, expect } from './website-fixture'

test('production prerendering preserves a running development site and its number entrance', async ({
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
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(server.resolvedUrls!.local[0])
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // This builds and prerenders a separate artifact while development remains open.
    await promisify(execFile)('bun', ['scripts/build-analytics-fixture.ts'])
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const number = page.locator('.download-digits')
    await expect(number).toHaveCSS('opacity', '0')
    const frames = await number.evaluate(async element => {
      element.scrollIntoView({ block: 'center', behavior: 'instant' })
      const frames: number[] = []
      for (let index = 0; index < 40; index++) {
        await new Promise(requestAnimationFrame)
        frames.push(Number(getComputedStyle(element).opacity))
      }
      return frames
    })
    expect(frames.filter(opacity => opacity > 0 && opacity < 1).length).toBeGreaterThan(2)
    expect(frames.at(-1)).toBe(1)
    expect(errors).toEqual([])
  } finally {
    await server.close()
  }
})
