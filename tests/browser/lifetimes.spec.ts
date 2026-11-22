import { expect, type Page, test } from '@playwright/test'

import { addModernStyles, preparePage } from './helpers'

const body = `<img id="first" src="/images/image-1.jpg" width="160" alt="First">
  <img id="second" src="/images/image-2.jpg" width="160" alt="Second">
  <img id="third" src="/images/image-1.jpg" width="160" alt="Third">`

async function fixture(page: Page, controls = false) {
  await preparePage(page, { body })
  await addModernStyles(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(async controls => {
    const { createZoom } = await window.loadEntry('core')
    const { dialog } = await window.loadEntry('renderers')
    const { galleryControls } = await window.loadEntry('gallery')
    window.modalZoom = createZoom('img', {
      renderer: dialog(controls ? { content: galleryControls() } : {}),
    })
  }, controls)
}

test('gallery handles share one gallery and release independently', async ({
  page,
}) => {
  await fixture(page)
  const result = await page.evaluate(async () => {
    const { createGallery } = await window.loadEntry('gallery')
    const zoom = window.modalZoom
    const first = createGallery(zoom)
    const second = createGallery(zoom)
    let firstNotified = 0
    let secondNotified = 0
    const listener = () => secondNotified++
    first.subscribe(() => firstNotified++)
    // The same function through two handles: each subscription is its own.
    first.subscribe(listener)
    second.subscribe(listener)
    await zoom.open()
    first.dispose()
    await second.next()
    const index = second.getSnapshot().index
    // A released handle no longer opens images.
    await first.next()
    const after = zoom.getSnapshot().image?.id
    await zoom.close()
    second.dispose()
    return {
      shared: first.getSnapshot() === second.getSnapshot(),
      firstNotified,
      secondNotified,
      index,
      after,
    }
  })
  // Opening notified both handles; after its release only the second one hears the
  // replacement and the close.
  expect(result).toEqual({
    shared: true,
    firstNotified: 1,
    secondNotified: 4,
    index: 1,
    after: 'second',
  })
})

test('an aborted signal releases a gallery handle', async ({ page }) => {
  await fixture(page)
  const result = await page.evaluate(async () => {
    const { createGallery } = await window.loadEntry('gallery')
    const controller = new AbortController()
    const gallery = createGallery(window.modalZoom, {
      signal: controller.signal,
    })
    let notified = 0
    gallery.subscribe(() => notified++)
    controller.abort()
    await window.modalZoom.open()
    await gallery.next()
    const image = window.modalZoom.getSnapshot().image?.id
    await window.modalZoom.close()
    const aborted = createGallery(window.modalZoom, {
      signal: controller.signal,
    })
    aborted.subscribe(() => notified++)
    await window.modalZoom.open()
    await window.modalZoom.close()
    return { notified, image }
  })
  expect(result).toEqual({ notified: 0, image: 'first' })
})

test('the stock controls keep working when the application releases its gallery', async ({
  page,
}) => {
  await fixture(page, true)
  await page.evaluate(async () => {
    const { createGallery } = await window.loadEntry('gallery')
    const gallery = createGallery(window.modalZoom)
    await window.modalZoom.open()
    gallery.dispose()
  })
  await page.locator('.medium-zoom-control--next').click()
  await expect
    .poll(() => page.evaluate(() => window.modalZoom.getSnapshot().image?.id))
    .toBe('second')
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(() => page.evaluate(() => window.modalZoom.getSnapshot().image?.id))
    .toBe('third')
})

test('content receives a signal that aborts once it is removed', async ({
  page,
}) => {
  await preparePage(page, { body })
  await addModernStyles(page)
  const events = await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { dialog } = await window.loadEntry('renderers')
    const events: string[] = []
    let signal: AbortSignal | undefined
    const zoom = createZoom('#first', {
      renderer: dialog({
        content: view => {
          signal = view.signal
          view.signal.addEventListener('abort', () => events.push('aborted'))
          return () => events.push(`cleanup:${view.signal.aborted}`)
        },
      }),
    })
    await zoom.open()
    events.push(`open:${signal!.aborted}`)
    await zoom.close()
    return events
  })
  expect(events).toEqual(['open:false', 'cleanup:false', 'aborted'])
})

test('trigger bindings are shared and restore the images once every caller unbinds', async ({
  page,
}) => {
  await fixture(page)
  const image = page.locator('#first')
  await page.evaluate(async () => {
    const { bindZoomTriggers } = await window.loadEntry('triggers')
    const controller = new AbortController()
    const unbind = bindZoomTriggers(window.modalZoom)
    bindZoomTriggers(window.modalZoom, { signal: controller.signal })
    Object.assign(window, { unbindFirst: unbind, controller })
  })
  await expect(image).toHaveAttribute('role', 'button')
  await page.evaluate(() => {
    const own = window as unknown as { unbindFirst: () => void }
    own.unbindFirst()
    own.unbindFirst()
  })
  await expect(image).toHaveAttribute('role', 'button')
  await page.evaluate(() =>
    (window as unknown as { controller: AbortController }).controller.abort()
  )
  await expect(image).not.toHaveAttribute('role')
  await expect(image).not.toHaveAttribute('tabindex')
})

test('aborting the signal of createZoom closes and detaches the zoom', async ({
  page,
}) => {
  await preparePage(page, { body })
  await addModernStyles(page)
  const result = await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { dialog } = await window.loadEntry('renderers')
    const controller = new AbortController()
    const zoom = createZoom('img', {
      renderer: dialog(),
      signal: controller.signal,
    })
    const reasons: string[] = []
    zoom.on('closed', event => reasons.push(event.detail.reason))
    await zoom.open()
    controller.abort()
    await new Promise(resolve => setTimeout(resolve, 500))
    const late = createZoom('img', { signal: controller.signal })
    return {
      images: zoom.getImages().length,
      status: zoom.getSnapshot().status,
      reasons,
      late: late.getImages().length,
    }
  })
  expect(result).toEqual({
    images: 0,
    status: 'closed',
    reasons: ['detach'],
    late: 0,
  })
})

test('the gallery keyboard unbinds when its signal aborts', async ({
  page,
}) => {
  await fixture(page)
  const result = await page.evaluate(async () => {
    const { createGallery, bindGalleryKeyboard } =
      await window.loadEntry('gallery')
    const gallery = createGallery(window.modalZoom)
    const controller = new AbortController()
    bindGalleryKeyboard(document.body, gallery, { signal: controller.signal })
    await window.modalZoom.open()
    controller.abort()
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
    )
    await new Promise(resolve => setTimeout(resolve, 100))
    const image = window.modalZoom.getSnapshot().image?.id
    await window.modalZoom.close()
    gallery.dispose()
    return image
  })
  expect(result).toBe('first')
})
