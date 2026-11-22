import { execFileSync, spawn } from 'node:child_process'
import { resolve } from 'node:path'

import { expect, test } from '@playwright/test'

import {
  decodeImages,
  dismissZoom,
  observeErrors,
  openImage,
} from '../browser/helpers.ts'
import { rscPort, rscUrl } from '../server-urls.ts'

// The Next.js fixture builds and serves only when this project runs.
const fixture = resolve('tests/fixtures/next')
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }
let stop = () => {}
test.beforeAll(async () => {
  test.setTimeout(180_000)
  execFileSync('bun', ['run', 'build'], { cwd: fixture, env, stdio: 'inherit' })
  const server = spawn(
    'node_modules/.bin/next',
    ['start', '--hostname', '127.0.0.1', '--port', String(rscPort)],
    { cwd: fixture, env, detached: true, stdio: 'inherit' }
  )
  stop = () => process.kill(-server.pid!)
  await expect
    .poll(
      () =>
        fetch(rscUrl).then(
          ({ ok }) => ok,
          () => false
        ),
      {
        timeout: 60_000,
      }
    )
    .toBe(true)
})
test.afterAll(() => stop())

for (const path of ['/zoom', '/composed']) {
  test(`${path}: a Server Component renders the image in the initial HTML without JavaScript`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    try {
      const page = await context.newPage()
      const response = await page.goto(path)
      expect(response!.ok()).toBe(true)
      expect(await response!.text()).toContain('Rendered by a Server Component')
      await expect(
        page.getByRole('heading', { name: 'Rendered by a Server Component' })
      ).toBeVisible()
      await expect(
        page.getByRole('button', {
          name: 'Zoom image: Ocean sunset from a Server Component',
        })
      ).toBeVisible()
      await expect(page.locator('img')).toHaveAttribute('width', '1920')
    } finally {
      await context.close()
    }
  })

  test(`${path}: hydrates server HTML and carries server props across client navigation`, async ({
    page,
  }) => {
    const errors = observeErrors(page, { includeConsole: true })
    await page.goto(path)
    // Hydrate the actual server response before exercising the RSC client transport.
    await expect(
      page.getByRole('heading', { name: 'Rendered by a Server Component' })
    ).toBeVisible()
    const trigger = page.getByRole('button', {
      name: 'Zoom image: Ocean sunset from a Server Component',
    })
    const image = trigger.locator('img')
    await decodeImages(image)
    await expect(path === '/zoom' ? image : trigger).toHaveClass(/server-image/)
    await openImage(page, image, { trigger, via: 'keyboard' })
    await expect(page.locator('.medium-zoom-overlay')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)'
    )
    const bounds = await page
      .locator('.medium-zoom-image--opened')
      .boundingBox()
    expect(bounds!.x).toBeGreaterThanOrEqual(31)
    expect(bounds!.y).toBeGreaterThanOrEqual(31)
    await dismissZoom(page)
    await expect(trigger).toBeFocused()
    await page.getByRole('link', { name: 'Back to fixture home' }).click()
    await expect(
      page.getByRole('heading', { name: 'Server Components fixture' })
    ).toBeVisible()
    await page
      .getByRole('link', {
        name:
          path === '/zoom'
            ? 'Open the image example'
            : 'Open the composed example',
      })
      .click()
    await expect(
      page.getByRole('heading', { name: 'Rendered by a Server Component' })
    ).toBeVisible()
    await decodeImages(image)
    await openImage(page, image, { trigger, via: 'keyboard' })
    await dismissZoom(page)
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
