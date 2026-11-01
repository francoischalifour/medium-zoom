import { test, expect, type Page } from '@playwright/test'

import type { GalleryController } from '../../src/gallery'
import { preparePage } from './helpers'

declare global {
  interface Window {
    galleryController: GalleryController
  }
}
async function fixture(page: Page) {
  await preparePage(page, {
    body: '<img id="first" src="/images/image-1.jpg" width="160" alt="Sunset"><img id="second" src="/images/image-2.jpg" width="160" alt="Skateboard">',
  })
  await page.addStyleTag({ url: '/experimental/dist/modern/style.css' })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(async () => {
    const core = '/experimental/dist/core/index.mjs',
      sessions = '/experimental/dist/session/index.mjs',
      galleries = '/experimental/dist/gallery/index.mjs',
      renderers = '/experimental/dist/renderers/index.mjs'
    const { createMediumZoom } = (await import(core)) as typeof import('../../src/core')
    const { createZoomSession } = (await import(sessions)) as typeof import('../../src/session')
    const { createGallery } = (await import(galleries)) as typeof import('../../src/gallery')
    const { dialog } = (await import(renderers)) as typeof import('../../src/renderers')
    window.zoom = createMediumZoom({ renderer: dialog() })('img')
    createZoomSession(window.zoom)
    window.galleryController = createGallery(window.zoom)
  })
}

test('headless traversal creates no controls and publishes stable snapshots', async ({ page }) => {
  await fixture(page)
  const result = await page.evaluate(async () => {
    const gallery = window.galleryController
    const initial = gallery.getSnapshot()
    if (initial !== gallery.getSnapshot()) {
      throw new Error('Snapshot identity changed without a state change')
    }
    const indexes: number[] = []
    const unsubscribe = gallery.subscribe(() => indexes.push(gallery.getSnapshot().index))
    await window.zoom.open()
    await gallery.next()
    const selected = gallery.getSnapshot()
    await gallery.next()
    const bounded = gallery.getSnapshot() === selected
    await gallery.previous()
    await window.zoom.close()
    unsubscribe()
    return {
      indexes,
      bounded,
      closed: gallery.getSnapshot().index,
      controls: document.querySelectorAll('.medium-zoom-gallery').length,
    }
  })
  expect(result).toEqual({ indexes: [0, 1, 0, -1], bounded: true, closed: -1, controls: 0 })
})

test('controller owns dynamic collection bounds and releases subscriptions', async ({ page }) => {
  await fixture(page)
  expect(
    await page.evaluate(async () => {
      const gallery = window.galleryController
      const extra = document.querySelector('#first')!.cloneNode() as HTMLImageElement
      extra.id = 'third'
      document.body.append(extra)
      gallery.attach(extra)
      await gallery.select(2)
      const count = gallery.getSnapshot().images.length
      gallery.detach(extra)
      await window.zoom.close()
      let notified = 0
      gallery.subscribe(() => notified++)
      gallery.dispose()
      await window.zoom.open()
      await gallery.next()
      return { count, index: window.zoom.getZoomedImage()?.id, notified }
    })
  ).toEqual({ count: 3, index: 'first', notified: 0 })
  await page.evaluate(() => window.zoom.close())
})

test('sessions and gallery traversal are independent and idempotent', async ({ page }) => {
  await fixture(page)
  expect(
    await page.evaluate(async () => {
      const galleries = '/experimental/dist/gallery/index.mjs',
        sessions = '/experimental/dist/session/index.mjs'
      const { createGallery } = (await import(galleries)) as typeof import('../../src/gallery')
      const { createZoomSession } = (await import(sessions)) as typeof import('../../src/session')
      const first = createZoomSession(window.zoom)
      const second = createZoomSession(window.zoom)
      const same = createGallery(window.zoom) === window.galleryController
      await first.open()
      await window.galleryController.next()
      await second.close()
      return {
        sameSession: first === second,
        sameController: same,
        closed: !window.zoom.getZoomedImage(),
      }
    })
  ).toEqual({ sameSession: true, sameController: true, closed: true })
})
