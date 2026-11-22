import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

import { preparePage } from './helpers'

declare global {
  interface Window {
    modernZoom: import('../../src/modern/medium-zoom').Zoom
    createModernZoom: typeof import('../../src/modern/medium-zoom').default
  }
}

async function loadModern(page: Page, entry = 'modern/index.mjs') {
  await preparePage(page, {
    body: '<img id="image" src="/images/image-1.jpg" data-zoom-src="/images/image-2.jpg" width="160" alt="Mountain"><img id="second" src="/images/image-1.jpg" width="120" alt="Lake">',
  })
  await page.evaluate(async entry => {
    if (entry.endsWith('.cjs')) {
      const module = { exports: {} }
      const code = await (await fetch(`/preview/dist/${entry}`)).text()
      // oxlint-disable-next-line typescript/no-implied-eval -- Execute our packed artifact in its module scope.
      new Function('module', 'exports', code)(module, module.exports)
      window.createModernZoom = module.exports as typeof window.createModernZoom
    } else {
      window.createModernZoom = (await import(`/preview/dist/${entry}`)).default
    }
    window.modernZoom = window.createModernZoom('#image', { margin: 24 })
  }, entry)
}

for (const entry of [
  'modern/index.mjs',
  'modern/index.cjs',
  'modern/pure/index.mjs',
  'modern/pure/index.cjs',
]) {
  test(`${entry}: lean contract, keyboard zoom, HD and cleanup`, async ({
    page,
  }) => {
    await loadModern(page, entry)
    if (entry.includes('/pure/')) {
      expect(await page.locator('style').allTextContents()).not.toEqual(
        expect.arrayContaining([
          expect.stringContaining('--medium-zoom-duration'),
        ])
      )
      await page.addStyleTag({ url: '/preview/dist/modern/style.css' })
    }
    expect(
      await page.evaluate(() => Object.keys(window.modernZoom).sort())
    ).toEqual([
      'attach',
      'close',
      'destroy',
      'detach',
      'getSnapshot',
      'open',
      'subscribe',
      'update',
    ])
    const image = page.locator('#image')
    await expect(image).toHaveAttribute('role', 'button')
    await image.focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('dialog')).toBeVisible()
    await expect
      .poll(() => page.evaluate(() => window.modernZoom.getSnapshot().status))
      .toBe('open')
    await expect(page.locator('dialog img[src$="image-2.jpg"]')).toBeVisible()
    await expect(page.locator('.medium-zoom-control')).toHaveCount(0)
    expect(
      await page
        .locator('dialog')
        .evaluate(element => element.style.colorScheme)
    ).toBe('')
    await page.keyboard.press('Escape')
    await expect(page.locator('dialog')).toHaveCount(0)
    await expect(image).toBeFocused()
    await page.evaluate(() => {
      window.modernZoom.attach('#second')
      window.modernZoom.detach('#image')
    })
    await expect(image).not.toHaveAttribute('role', 'button')
    await page.locator('#second').click()
    await expect(page.locator('dialog')).toBeVisible()
    await page.evaluate(() => window.modernZoom.destroy())
    await expect(page.locator('dialog')).toHaveCount(0)
    await expect(page.locator('#second')).not.toHaveAttribute('role', 'button')
    await page.evaluate(() => {
      window.modernZoom.destroy()
      window.modernZoom.attach('img')
    })
    expect(
      await page.evaluate(() => window.modernZoom.getSnapshot().images.length)
    ).toBe(0)
  })
}

test('state observation replaces legacy DOM events and abort tears down bindings', async ({
  page,
}) => {
  await loadModern(page)
  const state = await page.evaluate(async () => {
    window.modernZoom.destroy()
    const controller = new AbortController()
    const zoom = window.createModernZoom('#image', {
      signal: controller.signal,
    })
    window.modernZoom = zoom
    const statuses: string[] = []
    const events: string[] = []
    for (const type of [
      'open',
      'opened',
      'close',
      'closed',
      'attach',
      'detach',
      'update',
    ]) {
      document
        .querySelector('#image')!
        .addEventListener(`medium-zoom:${type}`, () => events.push(type))
    }
    const unsubscribe = zoom.subscribe(() =>
      statuses.push(zoom.getSnapshot().status)
    )
    const snapshot = zoom.getSnapshot()
    const stable = snapshot === zoom.getSnapshot() && Object.isFrozen(snapshot)
    await zoom.open()
    controller.abort()
    await zoom.close()
    unsubscribe()
    return { statuses, events, stable, count: zoom.getSnapshot().images.length }
  })
  expect(state.events).toEqual([])
  expect(state.stable).toBe(true)
  expect(state.statuses).toEqual(expect.arrayContaining(['opening', 'open']))
  expect(state.count).toBe(0)
  await expect(page.locator('#image')).not.toHaveAttribute('tabindex')
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('structural styles respect motion, app overrides and custom properties without a theme', async ({
  page,
}) => {
  await loadModern(page)
  await page.addStyleTag({
    content:
      ':root { --medium-zoom-duration: 120ms; --medium-zoom-backdrop: rgb(20, 30, 40) } .medium-zoom-overlay { border-radius: 2px }',
  })
  await page.locator('#image').click()
  const overlay = page.locator('.medium-zoom-overlay')
  await expect(overlay).toHaveCSS('background-color', 'rgb(20, 30, 40)')
  await expect(overlay).toHaveCSS('transition-duration', '0.12s')
  await expect(overlay).toHaveCSS('border-radius', '2px')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(overlay).toHaveCSS('transition-duration', '0s')
  await page.evaluate(() => window.modernZoom.close())
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('a pre-aborted preset cannot attach or open images', async ({ page }) => {
  await loadModern(page)
  await page.evaluate(async () => {
    window.modernZoom.destroy()
    const controller = new AbortController()
    controller.abort()
    window.modernZoom = window.createModernZoom('img', {
      signal: controller.signal,
    })
    window.modernZoom.attach('img')
    await window.modernZoom.open()
  })
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('img[role="button"]')).toHaveCount(0)
})

test('HD failure keeps the preview usable and accessible', async ({ page }) => {
  await loadModern(page)
  await page.route('**/unavailable.jpg', route =>
    route.fulfill({ status: 404, body: '' })
  )
  await page
    .locator('#image')
    .evaluate(image => image.setAttribute('data-zoom-src', '/unavailable.jpg'))
  await page.locator('#image').click()
  await expect
    .poll(() => page.evaluate(() => window.modernZoom.getSnapshot().status))
    .toBe('open')
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
  await expect(page.locator('dialog img[src$="image-1.jpg"]')).toBeVisible()
  expect(
    (await new AxeBuilder({ page }).include('dialog').analyze()).violations
  ).toEqual([])
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('reduced motion also disables the HD crossfade animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loadModern(page)
  await page.locator('#image').click()
  await expect(page.locator('dialog img[src$="image-2.jpg"]')).toBeVisible()
  expect(
    await page
      .locator('dialog')
      .evaluate(
        element =>
          element
            .getAnimations({ subtree: true })
            .filter(animation => animation.playState === 'running').length
      )
  ).toBe(0)
})
