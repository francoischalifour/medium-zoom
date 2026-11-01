import { test, expect, type Page } from '@playwright/test'

import type { GalleryController } from '../../src/gallery'
import { preparePage } from './helpers'

declare global {
  interface Window {
    transitionGallery: GalleryController
    transitionLog: Array<{
      direction: number
      outgoing: number
      incoming: number
      prepared: boolean
      aborted: boolean
      ownsDisposal: boolean
    }>
    finishTransitions: Array<() => void>
    gallerySettled: number
  }
}
async function fixture(page: Page, mode: 'deferred' | 'throw' | 'reject' | 'animate' = 'deferred') {
  await preparePage(page, {
    body: '<button id="trigger">Trigger</button><img id="first" src="/images/image-1.jpg" width="160" alt="Sunset"><img id="second" src="/images/image-2.jpg" width="160" alt="Skateboard"><img id="third" src="/images/image-1.jpg" width="160" alt="Ocean">',
  })
  await page.addStyleTag({ url: '/experimental/dist/modern/style.css' })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(async mode => {
    const core = '/experimental/dist/core/index.mjs',
      renderers = '/experimental/dist/renderers/index.mjs',
      galleries = '/experimental/dist/gallery/index.mjs',
      sessions = '/experimental/dist/session/index.mjs'
    const { createMediumZoom } = (await import(core)) as typeof import('../../src/core')
    const { dialog } = (await import(renderers)) as typeof import('../../src/renderers')
    const { createGallery } = (await import(galleries)) as typeof import('../../src/gallery')
    const { createZoomSession } = (await import(sessions)) as typeof import('../../src/session')
    window.transitionLog = []
    window.finishTransitions = []
    window.gallerySettled = 0
    const { hdImage } = (await import(
      String('/experimental/dist/features/index.mjs')
    )) as typeof import('../../src/features')
    window.zoom = createMediumZoom({
      features: [hdImage()],
      renderer: dialog({
        transition: ({ outgoing, incoming, direction, signal }) => {
          if (mode === 'throw') {
            throw new Error('Consumer transition failed')
          }
          if (mode === 'reject') {
            return Promise.reject(new Error('Consumer transition failed'))
          }
          const entry = {
            direction,
            outgoing: outgoing.length,
            incoming: incoming.length,
            prepared: [...outgoing, ...incoming].every(
              frame => !!frame.geometry && !!frame.element.style.transform
            ),
            aborted: false,
            ownsDisposal: [...outgoing, ...incoming].some(frame => 'dispose' in frame),
          }
          window.transitionLog.push(entry)
          if (mode === 'animate') {
            signal.addEventListener(
              'abort',
              () => {
                entry.aborted = true
              },
              { once: true }
            )
            return Promise.all(
              incoming.map(
                frame =>
                  frame.element.animate([{ opacity: 0 }, { opacity: 1 }], {
                    duration: 10_000,
                    fill: 'both',
                  }).finished
              )
            ).then(() => undefined)
          }
          return new Promise<void>(resolve => {
            window.finishTransitions.push(resolve)
            signal.addEventListener(
              'abort',
              () => {
                entry.aborted = true
                resolve()
              },
              { once: true }
            )
          })
        },
      }),
    })('img')
    createZoomSession(window.zoom)
    window.transitionGallery = createGallery(window.zoom)
    await window.zoom.open({ trigger: document.querySelector('#trigger')! })
  }, mode)
}

test('consumer strategies receive prepared frames/direction while the engine owns retirement', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => {
    void window.transitionGallery.next().then(() => window.gallerySettled++)
  })
  await expect.poll(() => page.evaluate(() => window.transitionLog.length)).toBe(1)
  expect(await page.evaluate(() => window.transitionLog[0])).toEqual({
    direction: 1,
    outgoing: 1,
    incoming: 1,
    prepared: true,
    aborted: false,
    ownsDisposal: false,
  })
  await expect(page.locator('dialog img')).toHaveCount(2)
  await expect(page.getByRole('dialog').getByRole('img')).toHaveCount(1)
  expect(await page.evaluate(() => window.gallerySettled)).toBe(0)
  await page.evaluate(() => window.finishTransitions.shift()!())
  await expect.poll(() => page.evaluate(() => window.gallerySettled)).toBe(1)
  await expect(page.locator('dialog img')).toHaveCount(1)
  await page.evaluate(() => {
    void window.transitionGallery.previous()
  })
  await expect.poll(() => page.evaluate(() => window.transitionLog[1]?.direction)).toBe(-1)
  await page.evaluate(() => window.zoom.close())
  expect(await page.evaluate(() => window.transitionLog[1]!.aborted)).toBe(true)
  await expect(page.locator('dialog,.medium-zoom-image--hidden')).toHaveCount(0)
  await expect(page.locator('#trigger')).toBeFocused()
})

test('rapid navigation and close cancel obsolete effects and settle every request', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => {
    void window.transitionGallery.next().then(() => window.gallerySettled++)
  })
  await expect.poll(() => page.evaluate(() => window.transitionLog.length)).toBe(1)
  await page.evaluate(() => {
    void window.transitionGallery.next().then(() => window.gallerySettled++)
  })
  await expect.poll(() => page.evaluate(() => window.transitionLog.length)).toBe(2)
  expect(await page.evaluate(() => window.transitionLog[0]!.aborted)).toBe(true)
  await page.evaluate(() => window.zoom.close())
  await expect.poll(() => page.evaluate(() => window.gallerySettled)).toBe(2)
  expect(await page.evaluate(() => window.transitionLog.every(call => call.aborted))).toBe(true)
  await page.evaluate(() => window.finishTransitions.forEach(finish => finish()))
  await expect(
    page.locator('dialog,.medium-zoom-image--opened,.medium-zoom-image--hidden')
  ).toHaveCount(0)
})

test('reduced motion bypasses strategies and interrupts a running strategy', async ({ page }) => {
  await fixture(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => window.transitionGallery.next())
  expect(await page.evaluate(() => window.transitionLog.length)).toBe(0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => {
    void window.transitionGallery.next().then(() => window.gallerySettled++)
  })
  await expect.poll(() => page.evaluate(() => window.transitionLog.length)).toBe(1)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(() => page.evaluate(() => window.gallerySettled)).toBe(1)
  expect(await page.evaluate(() => window.transitionLog[0]!.aborted)).toBe(true)
  await expect(page.locator('dialog img')).toHaveCount(1)
})

test('a rejected strategy uses normal close cleanup without leaking frames', async ({ page }) => {
  await fixture(page, 'throw')
  expect(
    await page.evaluate(async () => {
      try {
        await window.transitionGallery.next()
        return false
      } catch (error) {
        await window.zoom.close()
        return (error as Error).message === 'Consumer transition failed'
      }
    })
  ).toBe(true)
  await expect(
    page.locator('dialog,.medium-zoom-image--opened,.medium-zoom-image--hidden')
  ).toHaveCount(0)
})

test('the engine cancels Web Animations and retires every frame on detach', async ({ page }) => {
  await fixture(page, 'animate')
  await page.evaluate(() => {
    void window.transitionGallery.next().then(() => window.gallerySettled++)
  })
  await expect.poll(() => page.evaluate(() => window.transitionLog.length)).toBe(1)
  expect(
    await page.locator('dialog').evaluate(node => node.getAnimations({ subtree: true }).length)
  ).toBeGreaterThan(0)
  await page.evaluate(() => window.zoom.detach())
  await expect.poll(() => page.evaluate(() => window.gallerySettled)).toBe(1)
  await expect(
    page.locator('dialog,.medium-zoom-image--opened,.medium-zoom-image--hidden')
  ).toHaveCount(0)
  expect(await page.evaluate(() => window.transitionLog[0]!.aborted)).toBe(true)
})

test('HD content is fitted before entering the strategy and keeps one accessible image', async ({
  page,
}) => {
  await fixture(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  await page.route('**/pending-frame.jpg', async route => {
    await gate
    await route.fulfill({ path: 'stories/images/image-1.jpg', contentType: 'image/jpeg' })
  })
  await page.evaluate(() => {
    document.querySelector('#second')!.setAttribute('data-zoom-src', '/pending-frame.jpg')
    void window.transitionGallery.next().then(() => window.gallerySettled++)
  })
  await expect(page.locator('dialog')).toHaveAttribute('aria-busy', 'true')
  expect(await page.evaluate(() => window.transitionLog.length)).toBe(0)
  await expect(page.getByRole('dialog').getByRole('img', { name: 'Sunset' })).toHaveCount(1)
  release()
  await expect.poll(() => page.evaluate(() => window.transitionLog.length)).toBe(1)
  expect(await page.evaluate(() => window.transitionLog[0])).toMatchObject({
    incoming: 2,
    prepared: true,
  })
  await expect(page.getByRole('dialog').getByRole('img')).toHaveCount(1)
  await page.evaluate(() => window.finishTransitions.shift()!())
  await expect.poll(() => page.evaluate(() => window.gallerySettled)).toBe(1)
  await page.evaluate(() => window.zoom.close())
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('an asynchronously rejected strategy closes cleanly and allows a fresh opening', async ({
  page,
}) => {
  await fixture(page, 'reject')
  expect(
    await page.evaluate(async () => {
      try {
        await window.transitionGallery.next()
        return false
      } catch {
        await window.zoom.close()
        await window.zoom.open()
        await window.zoom.close()
        return true
      }
    })
  ).toBe(true)
  await expect(
    page.locator('dialog,.medium-zoom-image--opened,.medium-zoom-image--hidden')
  ).toHaveCount(0)
})
