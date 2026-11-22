import { expect, type Page, test } from '@playwright/test'

import type { GalleryController } from '../../src/gallery'
import { addModernStyles, preparePage } from './helpers'

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
async function fixture(
  page: Page,
  mode: 'deferred' | 'throw' | 'reject' | 'animate' = 'deferred'
) {
  await preparePage(page, {
    body: '<button id="trigger">Trigger</button><img id="first" src="/images/image-1.jpg" width="160" alt="Sunset"><img id="second" src="/images/image-2.jpg" width="160" alt="Skateboard"><img id="third" src="/images/image-1.jpg" width="160" alt="Ocean">',
  })
  await addModernStyles(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(async mode => {
    const { createZoom } = await window.loadEntry('core')
    const { dialog } = await window.loadEntry('renderers')
    const { createGallery } = await window.loadEntry('gallery')
    const { galleryTransition } = await window.loadEntry('transitions')
    window.transitionLog = []
    window.finishTransitions = []
    window.gallerySettled = 0
    const { loadHdImage } = await window.loadEntry('loaders')
    window.modalZoom = createZoom('img', {
      loader: loadHdImage,
      renderer: dialog({
        transition: galleryTransition(
          ({ outgoing, incoming, direction, signal }) => {
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
                frame =>
                  !!frame.transform &&
                  frame.transform === frame.element.style.transform
              ),
              aborted: false,
              ownsDisposal: [...outgoing, ...incoming].some(
                frame => 'dispose' in frame
              ),
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
          }
        ),
      }),
    })
    window.transitionGallery = createGallery(window.modalZoom)
    await window.modalZoom.open({
      trigger: document.querySelector('#trigger')!,
    })
  }, mode)
}

test('consumer strategies receive prepared frames/direction while the engine owns retirement', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => {
    void window.transitionGallery.next().then(() => window.gallerySettled++)
  })
  await expect
    .poll(() => page.evaluate(() => window.transitionLog.length))
    .toBe(1)
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
  // Pause as a browsing user would: an immediate change is stepping and skips the effect.
  await page.waitForTimeout(350)
  await page.evaluate(() => {
    void window.transitionGallery.previous()
  })
  await expect
    .poll(() => page.evaluate(() => window.transitionLog[1]?.direction))
    .toBe(-1)
  await page.evaluate(() => window.modalZoom.close())
  expect(await page.evaluate(() => window.transitionLog[1]!.aborted)).toBe(true)
  await expect(page.locator('dialog,.medium-zoom-image--hidden')).toHaveCount(0)
  await expect(page.locator('#trigger')).toBeFocused()
})

test('clicking an outgoing frame interrupts the transition and closes', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => {
    void window.transitionGallery.next().then(() => window.gallerySettled++)
  })
  await expect
    .poll(() => page.evaluate(() => window.transitionLog.length))
    .toBe(1)
  await expect(page.locator('dialog img')).toHaveCount(2)
  await page.locator('dialog img[aria-hidden="true"]').dispatchEvent('click')
  await expect(page.locator('dialog,.medium-zoom-image--hidden')).toHaveCount(0)
  expect(await page.evaluate(() => window.transitionLog[0]!.aborted)).toBe(true)
  await expect.poll(() => page.evaluate(() => window.gallerySettled)).toBe(1)
  expect(
    await page.evaluate(() => window.modalZoom.getZoomedImage())
  ).toBeNull()
})

test('a change that interrupts a running effect swaps at once and settles every request', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => {
    void window.transitionGallery.next().then(() => window.gallerySettled++)
  })
  await expect
    .poll(() => page.evaluate(() => window.transitionLog.length))
    .toBe(1)
  await page.evaluate(() => {
    void window.transitionGallery.next().then(() => window.gallerySettled++)
  })
  await expect.poll(() => page.evaluate(() => window.gallerySettled)).toBe(2)
  expect(await page.evaluate(() => window.transitionLog.length)).toBe(1)
  expect(await page.evaluate(() => window.transitionLog[0]!.aborted)).toBe(true)
  await expect(page.getByRole('dialog', { name: 'Ocean' })).toBeVisible()
  await expect(page.locator('dialog img')).toHaveCount(1)
  await page.evaluate(() => window.modalZoom.close())
  await page.evaluate(() =>
    window.finishTransitions.forEach(finish => finish())
  )
  await expect(
    page.locator('dialog,.medium-zoom-image--opened,.medium-zoom-image--hidden')
  ).toHaveCount(0)
})

test('closing mid-effect zooms out from where the effect left the image', async ({
  page,
}) => {
  await preparePage(page, {
    body: '<img src="/images/image-1.jpg" width="160" alt="Sunset"><img src="/images/image-2.jpg" width="160" alt="Skateboard"><img src="/images/image-1.jpg" width="160" alt="Ocean">',
  })
  await addModernStyles(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { dialog } = await window.loadEntry('renderers')
    const { createGallery } = await window.loadEntry('gallery')
    const { galleryTransition } = await window.loadEntry('transitions')
    window.transitionLog = []
    window.modalZoom = createZoom('img', {
      renderer: dialog({
        transition: galleryTransition(({ outgoing, incoming, direction }) => {
          const animations = [
            ...outgoing.map(({ element }) =>
              element.animate({ opacity: 0 }, 10_000)
            ),
            ...incoming.map(({ element, transform }) =>
              element.animate(
                [
                  {
                    opacity: 0,
                    transform: `translateX(${direction * 100}px) ${transform}`,
                  },
                  { opacity: 1, transform },
                ],
                10_000
              )
            ),
          ]
          // Paused halfway, so a close that resets frames shows as a jump.
          animations.forEach(animation => {
            animation.pause()
            animation.currentTime = 5_000
          })
          window.transitionLog.push({} as never)
          return new Promise<void>(() => {})
        }),
      }),
    })
    window.transitionGallery = createGallery(window.modalZoom)
    await window.modalZoom.open()
  })
  const frames = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('dialog img')].map(frame => ({
        left: Math.round(frame.getBoundingClientRect().left),
        opacity: Number(getComputedStyle(frame).opacity).toFixed(2),
      }))
    )
  await page.evaluate(() => {
    void window.transitionGallery.next()
  })
  await expect
    .poll(() => page.evaluate(() => window.transitionLog.length))
    .toBe(1)
  const halfway = await frames()
  expect(halfway.map(frame => frame.opacity)).toEqual(['0.50', '0.50'])
  const closing = await page.evaluate(() => {
    void window.modalZoom.close()
    const frame = document.querySelector('dialog img:last-of-type')!
    return {
      left: Math.round(frame.getBoundingClientRect().left),
      opacity: Number(getComputedStyle(frame).opacity).toFixed(2),
    }
  })
  expect(closing).toEqual(halfway[1])
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('reduced motion bypasses strategies and interrupts a running strategy', async ({
  page,
}) => {
  await fixture(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(() => window.transitionGallery.next())
  expect(await page.evaluate(() => window.transitionLog.length)).toBe(0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  // Pause as a browsing user would: an immediate change is stepping and skips the effect.
  await page.waitForTimeout(350)
  await page.evaluate(() => {
    void window.transitionGallery.next().then(() => window.gallerySettled++)
  })
  await expect
    .poll(() => page.evaluate(() => window.transitionLog.length))
    .toBe(1)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(() => page.evaluate(() => window.gallerySettled)).toBe(1)
  expect(await page.evaluate(() => window.transitionLog[0]!.aborted)).toBe(true)
  await expect(page.locator('dialog img')).toHaveCount(1)
})

test('a rejected strategy uses normal close cleanup without leaking frames', async ({
  page,
}) => {
  await fixture(page, 'throw')
  expect(
    await page.evaluate(async () => {
      try {
        await window.transitionGallery.next()
        return false
      } catch (error) {
        await window.modalZoom.close()
        return (error as Error).message === 'Consumer transition failed'
      }
    })
  ).toBe(true)
  await expect(
    page.locator('dialog,.medium-zoom-image--opened,.medium-zoom-image--hidden')
  ).toHaveCount(0)
})

test('the engine cancels Web Animations and retires every frame on detach', async ({
  page,
}) => {
  await fixture(page, 'animate')
  await page.evaluate(() => {
    void window.transitionGallery.next().then(() => window.gallerySettled++)
  })
  await expect
    .poll(() => page.evaluate(() => window.transitionLog.length))
    .toBe(1)
  expect(
    await page
      .locator('dialog')
      .evaluate(node => node.getAnimations({ subtree: true }).length)
  ).toBeGreaterThan(0)
  await page.evaluate(() => window.modalZoom.detach())
  await expect.poll(() => page.evaluate(() => window.gallerySettled)).toBe(1)
  await expect(
    page.locator('dialog,.medium-zoom-image--opened,.medium-zoom-image--hidden')
  ).toHaveCount(0)
  expect(await page.evaluate(() => window.transitionLog[0]!.aborted)).toBe(true)
})

test('the next image enters at once and sharpens in place once its effect settles', async ({
  page,
}) => {
  await fixture(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  let requested = false
  await page.route('**/pending-frame.jpg', async route => {
    requested = true
    await gate
    await route.fulfill({
      path: 'stories/images/image-2.jpg',
      contentType: 'image/jpeg',
    })
  })
  await page.evaluate(() => {
    document
      .querySelector('#second')!
      .setAttribute('data-zoom-src', '/pending-frame.jpg')
    void window.transitionGallery.next().then(() => window.gallerySettled++)
  })
  // The effect starts with the preview while the high-resolution image is still loading.
  await expect
    .poll(() => page.evaluate(() => window.transitionLog.length))
    .toBe(1)
  expect(requested).toBe(true)
  expect(await page.evaluate(() => window.transitionLog[0])).toMatchObject({
    incoming: 1,
    prepared: true,
  })
  const dialog = page.getByRole('dialog', { name: 'Skateboard' })
  await expect(dialog.getByRole('img')).toHaveCount(1)
  // Arriving mid-effect, the sharp image waits for the scene to settle.
  release()
  await page.waitForResponse('**/pending-frame.jpg')
  await expect(
    page.locator('dialog img[src$="pending-frame.jpg"]')
  ).toHaveCount(0)
  await page.evaluate(() => window.finishTransitions.shift()!())
  await expect.poll(() => page.evaluate(() => window.gallerySettled)).toBe(1)
  const sharp = page.locator('dialog img[src$="pending-frame.jpg"]')
  await expect(sharp).toHaveCount(1)
  await expect(dialog.getByRole('img')).toHaveCount(1)
  // It takes the preview's place: same box, nothing moves.
  const boxes = await page
    .locator('dialog img:not([aria-hidden])')
    .evaluateAll(frames =>
      frames.map(frame => {
        const { left, top, width, height } = frame.getBoundingClientRect()
        return [left, top, width, height].map(Math.round)
      })
    )
  expect(boxes).toHaveLength(1)
  const preview = await page
    .locator('dialog img[aria-hidden]:not([src$="pending-frame.jpg"])')
    .last()
    .evaluate(frame => {
      const { left, top, width, height } = frame.getBoundingClientRect()
      return [left, top, width, height].map(Math.round)
    })
  expect(boxes[0]).toEqual(preview)
  await page.evaluate(() => window.modalZoom.close())
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
        await window.modalZoom.close()
        await window.modalZoom.open()
        await window.modalZoom.close()
        return true
      }
    })
  ).toBe(true)
  await expect(
    page.locator('dialog,.medium-zoom-image--opened,.medium-zoom-image--hidden')
  ).toHaveCount(0)
})

for (const abortNavigates of [false, true]) {
  test(`synchronous strategy navigation releases its lease; abort navigation wins: ${abortNavigates}`, async ({
    page,
  }) => {
    await preparePage(page, {
      body: '<img id="first" src="/images/image-1.jpg" width="160" alt="First"><img id="second" src="/images/image-2.jpg" width="160" alt="Second"><img id="third" src="/images/image-1.jpg" width="160" alt="Third">',
    })
    await addModernStyles(page)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    expect(
      await page.evaluate(async abortNavigates => {
        const { createZoom } = await window.loadEntry('core')
        const { dialog } = await window.loadEntry('renderers')
        const { createGallery } = await window.loadEntry('gallery')
        const { galleryTransition } = await window.loadEntry('transitions')
        let gallery!: import('../../src/gallery').GalleryController
        let interrupted: AbortSignal | undefined
        let latest: Promise<unknown> | undefined
        let fromAbort: Promise<unknown> | undefined
        const zoom = createZoom('img', {
          renderer: dialog({
            transition: galleryTransition(context => {
              if (
                (context.incoming[0]!.element as HTMLImageElement).alt ===
                'Second'
              ) {
                interrupted = context.signal
                if (abortNavigates) {
                  context.signal.addEventListener(
                    'abort',
                    () => {
                      fromAbort = gallery.select(0)
                    },
                    { once: true }
                  )
                }
                latest = gallery.next()
                return new Promise<void>(() => {})
              }
            }),
          }),
        })
        gallery = createGallery(zoom)
        await zoom.open()
        await gallery.next()
        await latest
        await fromAbort
        const result = {
          current: zoom.getZoomedImage()?.id,
          aborted: interrupted?.aborted,
          dialogs: document.querySelectorAll('dialog').length,
          frames: document.querySelectorAll('.medium-zoom-image--opened')
            .length,
        }
        await zoom.close()
        return result
      }, abortNavigates)
    ).toEqual({
      current: abortNavigates ? 'first' : 'third',
      aborted: true,
      dialogs: 1,
      frames: 1,
    })
  })
}

test('navigation from successive open events waits for each frame and retained host', async ({
  page,
}) => {
  await preparePage(page, {
    body: '<img id="first" src="/images/image-1.jpg" width="160" alt="First"><img id="second" src="/images/image-2.jpg" width="160" alt="Second"><img id="third" src="/images/image-1.jpg" width="160" alt="Third">',
  })
  await addModernStyles(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(
    await page.evaluate(async () => {
      const { createZoom } = await window.loadEntry('core')
      const { dialog } = await window.loadEntry('renderers')
      const { createGallery } = await window.loadEntry('gallery')
      const zoom = createZoom('img', { renderer: dialog() })
      const gallery = createGallery(zoom)
      const moves: Promise<unknown>[] = []
      zoom.on('open', () => {
        if (zoom.getZoomedImage()?.id !== 'third') {
          moves.push(gallery.next())
        }
      })
      await zoom.open()
      await Promise.all(moves)
      const result = {
        current: zoom.getZoomedImage()?.id,
        dialogs: document.querySelectorAll('dialog').length,
        frames: document.querySelectorAll('.medium-zoom-image--opened').length,
      }
      await zoom.close()
      return result
    })
  ).toEqual({ current: 'third', dialogs: 1, frames: 1 })
})

test('slide() animates the incoming frame in from its side and settles in place', async ({
  page,
}) => {
  await preparePage(page, {
    body: '<img src="/images/image-1.jpg" width="160" alt="Sunset"><img src="/images/image-2.jpg" width="160" alt="Skateboard">',
  })
  await addModernStyles(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { dialog } = await window.loadEntry('renderers')
    const { slide } = await window.loadEntry('transitions')
    window.modalZoom = createZoom('img', {
      renderer: dialog({ transition: slide({ duration: 400 }) }),
    })
    await window.modalZoom.open()
  })
  const entering = await page.evaluate(async () => {
    const opening = window.modalZoom.open({
      target: document.querySelectorAll('body > img')[1] as HTMLElement,
    })
    // Two frames into the 400ms slide.
    for (let frame = 0; frame < 2; frame++) {
      await new Promise(resolve => requestAnimationFrame(resolve))
    }
    const frame = document.querySelector('dialog img:last-of-type')!
    const left = frame.getBoundingClientRect().left
    await opening
    return {
      left,
      settled: frame.getBoundingClientRect().left,
      frames: document.querySelectorAll('dialog img').length,
    }
  })
  expect(entering.left).toBeGreaterThan(entering.settled)
  expect(entering.frames).toBe(1)
})
