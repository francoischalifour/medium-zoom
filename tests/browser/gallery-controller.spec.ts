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
    const { createZoom } = (await import(core)) as typeof import('../../src/core')
    const { createZoomSession } = (await import(sessions)) as typeof import('../../src/session')
    const { createGallery } = (await import(galleries)) as typeof import('../../src/gallery')
    const { dialog } = (await import(renderers)) as typeof import('../../src/renderers')
    window.zoom = createZoom('img', { renderer: dialog() })
    createZoomSession(window.zoom)
    window.galleryController = createGallery(window.zoom as import('../../src/core').ModalZoom)
  })
}

test('headless traversal creates no controls, retains modal focus and publishes stable snapshots', async ({
  page,
}) => {
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
    const focusContained = document.activeElement === document.querySelector('dialog')
    await gallery.next()
    const controls = document.querySelectorAll(
      'dialog button, dialog input, dialog [role="button"]'
    ).length
    const selected = gallery.getSnapshot()
    await gallery.next()
    const bounded = gallery.getSnapshot() === selected
    await gallery.previous()
    await window.zoom.close()
    unsubscribe()
    return {
      indexes,
      focusContained,
      bounded,
      closed: gallery.getSnapshot().index,
      controls,
    }
  })
  expect(result).toEqual({
    indexes: [0, 1, 0, -1],
    focusContained: true,
    bounded: true,
    closed: -1,
    controls: 0,
  })
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
      const same =
        createGallery(window.zoom as import('../../src/core').ModalZoom) ===
        window.galleryController
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

test('direct instance mutations publish settled collection state and stale disposal stays inert', async ({
  page,
}) => {
  await fixture(page)
  expect(
    await page.evaluate(async () => {
      const { createGallery } = (await import(
        String('/experimental/dist/gallery/index.mjs')
      )) as typeof import('../../src/gallery')
      const old = window.galleryController
      old.dispose()
      const gallery = createGallery(window.zoom as import('../../src/core').ModalZoom)
      old.dispose()
      const counts: number[] = []
      gallery.subscribe(() => counts.push(gallery.getSnapshot().images.length))
      const extra = document.createElement('img')
      extra.src = '/images/image-1.jpg'
      document.body.append(extra)
      window.zoom.attach(extra)
      await Promise.resolve()
      window.zoom.detach(extra)
      await Promise.resolve()
      gallery.dispose()
      gallery.subscribe(() => {
        throw Error('Disposed subscription retained')
      })
      window.zoom.attach(extra)
      await Promise.resolve()
      return {
        counts,
        stable: createGallery(window.zoom as import('../../src/core').ModalZoom) !== gallery,
      }
    })
  ).toEqual({ counts: [3, 2], stable: true })
})
