import { type CDPSession, expect, type Page, test } from '@playwright/test'

import { addModernStyles, preparePage } from './helpers'

// Counts every listener a zoom, its renderer, gallery and bindings leave behind after many
// open and close cycles, and after many zooms are created and released by signal. Event
// listeners are read through the DevTools protocol, so this runs in Chromium only.

declare global {
  interface Window {
    cycle(): Promise<void>
    lifetime(): Promise<void>
  }
}

const body = `<img id="first" src="/images/image-1.jpg" width="160" alt="Mountain">
  <img id="second" src="/images/image-2.jpg" width="160" alt="Forest">
  <img id="third" src="/images/image-1.jpg" width="160" alt="Ocean">`

async function listeners(client: CDPSession) {
  const counts: Record<string, number> = {}
  for (const target of ['window', 'document', 'document.body']) {
    const { result } = await client.send('Runtime.evaluate', {
      expression: target,
    })
    const { listeners } = await client.send('DOMDebugger.getEventListeners', {
      objectId: result.objectId!,
    })
    counts[target] = listeners.length
  }
  const { result } = await client.send('Runtime.evaluate', {
    expression: 'document.querySelectorAll("img")',
  })
  const { result: images } = await client.send('Runtime.getProperties', {
    objectId: result.objectId!,
    ownProperties: true,
  })
  for (const { name, value } of images) {
    if (/^\d+$/.test(name) && value?.objectId) {
      const { listeners } = await client.send('DOMDebugger.getEventListeners', {
        objectId: value.objectId,
      })
      counts[`img ${name}`] = listeners.length
    }
  }
  return counts
}

async function fixture(page: Page) {
  await preparePage(page, { body })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await addModernStyles(page)
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { loadHdImage } = await window.loadEntry('loaders')
    const { bindZoomTriggers } = await window.loadEntry('triggers')
    const { dialog } = await window.loadEntry('renderers')
    const { createGallery, bindGalleryKeyboard, galleryControls } =
      await window.loadEntry('gallery')
    const images = () => [...document.querySelectorAll('img')]
    const settle = (zoom: import('../../src/zoom').ModalZoom) =>
      new Promise<void>(resolve => {
        if (zoom.getSnapshot().status === 'closed') {
          resolve()
          return
        }
        const stop = zoom.subscribe(() => {
          if (zoom.getSnapshot().status === 'closed') {
            stop()
            resolve()
          }
        })
      })
    // One zoom with stock controls, opened, stepped and closed again and again.
    const zoom = createZoom(images(), {
      loader: loadHdImage,
      renderer: dialog({ content: galleryControls() }),
    })
    bindZoomTriggers(zoom)
    window.cycle = async () => {
      await zoom.open({ target: images()[0]! })
      const gallery = createGallery(zoom)
      await gallery.next({ reason: 'api' })
      gallery.dispose()
      document
        .querySelector('dialog')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
      await zoom.close()
      await settle(zoom)
    }
    // A zoom created, opened and released with every binding by one signal.
    window.lifetime = async () => {
      const lifetime = new AbortController()
      const { signal } = lifetime
      const owned = createZoom(images(), {
        signal,
        group: null,
        renderer: dialog({
          content: view => {
            const gallery = createGallery(view.zoom, { signal: view.signal })
            bindGalleryKeyboard(view.element, gallery, { signal: view.signal })
          },
        }),
      })
      bindZoomTriggers(owned, { signal })
      const handle = createGallery(owned, { signal })
      handle.subscribe(() => {})
      await owned.open({ target: images()[1]! })
      lifetime.abort()
      await settle(owned)
    }
  })
}

test.beforeEach(({ browserName }) => {
  test.skip(browserName !== 'chromium', 'Listeners are read through CDP')
})

test('opening and closing a zoom many times leaves no listeners behind', async ({
  page,
}) => {
  await fixture(page)
  const client = await page.context().newCDPSession(page)
  // The first cycle loads the stylesheets and images it needs.
  await page.evaluate(() => window.cycle())
  const before = await listeners(client)
  await page.evaluate(async () => {
    for (let index = 0; index < 30; index++) {
      await window.cycle()
    }
  })
  expect(await listeners(client)).toEqual(before)
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('zooms released by their signal leave no listeners behind', async ({
  page,
}) => {
  await fixture(page)
  const client = await page.context().newCDPSession(page)
  await page.evaluate(() => window.lifetime())
  const before = await listeners(client)
  await page.evaluate(async () => {
    for (let index = 0; index < 30; index++) {
      await window.lifetime()
    }
  })
  expect(await listeners(client)).toEqual(before)
  await expect(page.locator('dialog')).toHaveCount(0)
})
