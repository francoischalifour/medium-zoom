import { execFileSync } from 'node:child_process'
import { test, expect, type Page } from '@playwright/test'
import { decodeImages, dismissZoom, observeErrors, openImage } from './helpers.ts'
import { shadcnDevUrl } from '../server-urls.ts'

const demo = '/examples/shadcn/playground.html'
const firstName = 'Zoom image: Ocean sunset'
const secondName = 'Zoom image: Floral skateboard'

async function ready(page: Page) {
  await page.goto(demo)
  await expect(page.locator('.medium-zoom-image')).toHaveCount(2)
  await decodeImages(page.locator('.gallery img'))
}

test('hydrates server markup without mismatches and forwards the image ref', async ({ page }) => {
  const errors = observeErrors(page)
  const markup = execFileSync('bun', ['examples/shadcn/tests/ssr.tsx'], { encoding: 'utf8' })
  await page.route(`**${demo}`, async route => {
    const response = await route.fetch()
    const html = (await response.text()).replace(
      '<div id="root"></div>',
      `<div id="root">${markup}</div>`
    )
    await route.fulfill({ response, body: html })
  })
  await ready(page)
  await page.getByRole('button', { name: 'Inspect ref', exact: true }).click()
  await expect(page.locator('output')).toHaveText('IMG')
  await page.getByRole('button', { name: firstName, exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  await dismissZoom(page)
  await expect(page.getByRole('button', { name: firstName, exact: true })).toBeFocused()
  expect(errors).toEqual([])
})

test('native keyboard controls, clone accessibility, and click dismissal', async ({ page }) => {
  await ready(page)
  const trigger = page.getByRole('button', { name: firstName, exact: true })
  await trigger.focus()
  await page.keyboard.press('Space')
  const clone = page.locator('.medium-zoom-image--opened')
  await expect(clone).toHaveAttribute('aria-hidden', 'true')
  await expect(clone).not.toHaveAttribute('tabindex')
  await expect(page.getByRole('button', { name: firstName, exact: true })).toHaveCount(1)
  await clone.click()
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test('consumer cancellation and disabled state prevent zooming', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Cancel clicks', exact: true }).click()
  await page.getByRole('button', { name: firstName, exact: true }).click()
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  await page.getByRole('button', { name: 'Cancel clicks', exact: true }).click()
  await page.getByRole('button', { name: 'Disable zoom', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ocean sunset', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Disable zoom', exact: true }).click()
  await page.getByRole('button', { name: firstName, exact: true }).click()
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  await dismissZoom(page)
})

test('serializes rapid instance switching, including repeated queued clicks', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: firstName, exact: true }).click()
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  // Real button activation while the overlay covers the other controls.
  const maxConcurrent = await page
    .getByRole('button', { name: secondName, exact: true })
    .evaluate(async button => {
      let maximum = 0
      const observer = new MutationObserver(() => {
        maximum = Math.max(maximum, document.querySelectorAll('.medium-zoom-overlay').length)
      })
      observer.observe(document.body, { childList: true })
      ;(button as HTMLButtonElement).click()
      ;(button as HTMLButtonElement).click()
      await new Promise<void>(resolve => {
        button
          .querySelector('img')!
          .addEventListener('medium-zoom:opened', () => resolve(), { once: true })
      })
      observer.disconnect()
      return maximum
    })
  expect(maxConcurrent).toBeLessThanOrEqual(1)
  await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(1)
  await expect(page.locator('.medium-zoom-image--opened')).toHaveAttribute(
    'alt',
    'Floral skateboard'
  )
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(1)
  await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
  await dismissZoom(page)
  await expect(page.locator('.medium-zoom-image--hidden')).toHaveCount(0)
})

for (const control of ['Hide first image', 'Disable zoom', 'Change source', 'Hide with Activity']) {
  test(`cleans up an opening zoom when using ${control}`, async ({ page }) => {
    const errors = observeErrors(page)
    await ready(page)
    await page
      .getByRole('button', { name: firstName, exact: true })
      .evaluate(button => (button as HTMLButtonElement).click())
    await page
      .getByRole('button', { name: control, exact: true })
      .evaluate(button => (button as HTMLButtonElement).click())
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
    await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(0)
    await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
    if (control === 'Disable zoom') {
      await expect(
        page.getByRole('button', { name: 'Ocean sunset', exact: true }).locator('img')
      ).toBeVisible()
    }
    if (control !== 'Change source') {
      await page.getByRole('button', { name: control, exact: true }).click()
    }
    await expect(page.getByRole('button', { name: firstName, exact: true })).toBeVisible()
    await page.getByRole('button', { name: firstName, exact: true }).click()
    await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
    await dismissZoom(page)
    expect(errors).toEqual([])
  })
}

test('uses updated options, scoped theme tokens, and same-document portals', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Render in portal', exact: true }).click()
  await page.getByRole('button', { name: 'Change margin', exact: true }).click()
  const trigger = page.getByRole('button', { name: firstName, exact: true })
  await trigger.evaluate(element => element.style.setProperty('--background', 'oklch(0.3 0 0)'))
  await trigger.locator('img').evaluate(image => {
    image.addEventListener(
      'medium-zoom:open',
      event => {
        ;(image as HTMLElement).dataset.margin = String(
          (event as CustomEvent).detail.zoom.getOptions().margin
        )
      },
      { once: true }
    )
  })
  await trigger.click()
  await expect(page.locator('.medium-zoom-overlay')).toHaveCSS('background-color', 'oklch(0.3 0 0)')
  await expect(trigger.locator('img')).toHaveAttribute('data-margin', '80')
  await dismissZoom(page)
})

test('reduced motion still completes open and close', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await ready(page)
  await page.getByRole('button', { name: firstName, exact: true }).click()
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  await dismissZoom(page)
})

test('unmount cancels a pending high-resolution image load', async ({ page }) => {
  await ready(page)
  await page.route('**/images/ocean-sunset.jpg?hd', () => {})
  await page.getByRole('button', { name: 'Load HD image', exact: true }).click()
  await page.getByRole('button', { name: firstName, exact: true }).click()
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  await page
    .getByRole('button', { name: 'Hide first image', exact: true })
    .evaluate(button => (button as HTMLButtonElement).click())
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  await page.getByRole('button', { name: secondName, exact: true }).click()
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  await dismissZoom(page)
})

test('development Strict Mode replays effects without duplicate zooms', async ({ page }) => {
  const errors = observeErrors(page)
  await page.goto(`${shadcnDevUrl}playground.html`)
  await expect(page.locator('.medium-zoom-image')).toHaveCount(2)
  await page.getByRole('button', { name: firstName, exact: true }).click()
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(1)
  await dismissZoom(page)
  await page.getByRole('button', { name: 'Hide with Activity', exact: true }).click()
  await page.getByRole('button', { name: 'Hide with Activity', exact: true }).click()
  await page.getByRole('button', { name: firstName, exact: true }).click()
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(1)
  await dismissZoom(page)
  expect(errors).toEqual([])
})

test('waits for an Escape-initiated close before opening another image', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: firstName, exact: true }).click()
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  const maximum = await page
    .getByRole('button', { name: secondName, exact: true })
    .evaluate(async button => {
      let maximum = 0
      const observer = new MutationObserver(() => {
        maximum = Math.max(maximum, document.querySelectorAll('.medium-zoom-overlay').length)
      })
      observer.observe(document.body, { childList: true })
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }))
      ;(button as HTMLButtonElement).click()
      await new Promise<void>(resolve => {
        button
          .querySelector('img')!
          .addEventListener('medium-zoom:opened', () => resolve(), { once: true })
      })
      observer.disconnect()
      return maximum
    })
  expect(maximum).toBe(1)
  await expect(page.locator('.medium-zoom-image--opened')).toHaveAttribute(
    'alt',
    'Floral skateboard'
  )
  await dismissZoom(page)
})

test('measures element containers at the time of opening', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Constrain to gallery', exact: true }).click()
  await page.getByRole('button', { name: firstName, exact: true }).click()
  const clone = page.locator('.medium-zoom-image--opened')
  await expect(clone).toBeVisible()
  await expect
    .poll(async () => {
      const bounds = await clone.boundingBox()
      const gallery = await page.locator('.gallery').boundingBox()
      return Boolean(
        bounds &&
        gallery &&
        bounds.x >= gallery.x + 23 &&
        bounds.y >= gallery.y + 23 &&
        bounds.x + bounds.width <= gallery.x + gallery.width - 23 &&
        bounds.y + bounds.height <= gallery.y + gallery.height - 23
      )
    })
    .toBe(true)
  await dismissZoom(page)
})

test('serves the installable registry with its component source and stylesheet', async ({
  request,
}) => {
  const response = await request.get('/r/image-zoom.json')
  expect(response.ok()).toBe(true)
  const item = await response.json()
  expect(item).toMatchObject({
    name: 'image-zoom',
    type: 'registry:ui',
    dependencies: ['medium-zoom@^1.1.2'],
    files: [
      {
        path: 'examples/shadcn/src/components/ui/image-zoom.tsx',
        type: 'registry:ui',
        content: expect.any(String),
      },
      {
        path: 'examples/shadcn/src/components/ui/image-zoom.css',
        type: 'registry:ui',
        content: expect.any(String),
      },
    ],
  })
})

test('keeps clones above the overlay despite inline stacking on the source', async ({ page }) => {
  await ready(page)
  const trigger = page.getByRole('button', { name: firstName, exact: true })
  await trigger.locator('img').evaluate(image => ((image as HTMLElement).style.zIndex = '0'))
  await trigger.click()
  const clone = page.locator('.medium-zoom-image--opened')
  await expect(clone).toHaveCSS('z-index', '51')
  await clone.click()
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test('preserves zoom classes across React className changes', async ({ page }) => {
  await ready(page)
  const trigger = page.getByRole('button', { name: firstName, exact: true })
  await trigger.click()
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  await page
    .getByRole('button', { name: 'Change image style', exact: true })
    .evaluate(button => (button as HTMLButtonElement).click())
  await expect(trigger.locator('img')).toHaveClass(/emphasized/)
  await expect(trigger.locator('img')).toHaveClass(/medium-zoom-image--hidden/)
  await dismissZoom(page)
  await expect(trigger.locator('img')).not.toHaveClass(/medium-zoom-image--hidden/)
  await trigger.click()
  await expect(page.locator('.medium-zoom-image--opened')).toHaveCSS('transition-duration', '0.3s')
  await dismissZoom(page)
})

test('options changed during a zoom apply to the next opening', async ({ page }) => {
  await page.setViewportSize({ width: 1_000, height: 1_100 })
  await ready(page)
  const trigger = page.getByRole('button', { name: firstName, exact: true })
  await openImage(page, trigger.locator('img'), { trigger })
  const enlarged = page.locator('.medium-zoom-image--opened')
  await expect(enlarged).toBeVisible()
  const width = (await enlarged.boundingBox())!.width
  // A keyboard user can change the surrounding UI without clicking the overlay.
  await page.getByRole('button', { name: 'Change margin', exact: true }).press('Enter')
  await expect(enlarged).toBeVisible()
  expect((await enlarged.boundingBox())!.width).toBeCloseTo(width, 0)
  await dismissZoom(page)
  await openImage(page, trigger.locator('img'), { trigger })
  await expect
    .poll(async () => (await enlarged.boundingBox())?.width ?? 0)
    .toBeLessThan(width - 100)
  await dismissZoom(page)
})
