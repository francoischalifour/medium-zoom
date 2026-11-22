import { expect, type Page, test } from '@playwright/test'

import type { GalleryController } from '../../src/gallery'
import { addModernStyles, preparePage } from './helpers'

declare global {
  interface Window {
    galleryController: GalleryController
  }
}
async function fixture(page: Page) {
  await preparePage(page, {
    body: '<img id="first" src="/images/image-1.jpg" width="160" alt="Sunset"><img id="second" src="/images/image-2.jpg" width="160" alt="Skateboard">',
  })
  await addModernStyles(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { createGallery } = await window.loadEntry('gallery')
    const { dialog } = await window.loadEntry('renderers')
    window.modalZoom = createZoom('img', { renderer: dialog() })
    window.galleryController = createGallery(window.modalZoom)
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
    const unsubscribe = gallery.subscribe(() =>
      indexes.push(gallery.getSnapshot().index)
    )
    await window.modalZoom.open()
    const focusContained =
      document.activeElement === document.querySelector('dialog')
    await gallery.next()
    const controls = document.querySelectorAll(
      'dialog button, dialog input, dialog [role="button"]'
    ).length
    const selected = gallery.getSnapshot()
    await gallery.next()
    const bounded = gallery.getSnapshot() === selected
    await gallery.previous()
    await window.modalZoom.close()
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

test('controller follows the zoom collection and releases subscriptions', async ({
  page,
}) => {
  await fixture(page)
  expect(
    await page.evaluate(async () => {
      const gallery = window.galleryController
      const extra = document
        .querySelector('#first')!
        .cloneNode() as HTMLImageElement
      extra.id = 'third'
      document.body.append(extra)
      window.modalZoom.attach(extra)
      await gallery.select(2)
      const count = gallery.getSnapshot().images.length
      window.modalZoom.detach(extra)
      await window.modalZoom.close()
      let notified = 0
      gallery.subscribe(() => notified++)
      gallery.dispose()
      await window.modalZoom.open()
      await gallery.next()
      return { count, index: window.modalZoom.getZoomedImage()?.id, notified }
    })
  ).toEqual({ count: 3, index: 'first', notified: 0 })
  await page.evaluate(() => window.modalZoom.close())
})

test('gallery handles share traversal and closing stays with the zoom', async ({
  page,
}) => {
  await fixture(page)
  expect(
    await page.evaluate(async () => {
      const { createGallery } = await window.loadEntry('gallery')
      // Each call is a handle of its own on the zoom's one gallery.
      const handle = createGallery(window.modalZoom)
      const shared =
        handle !== window.galleryController &&
        handle.getSnapshot() === window.galleryController.getSnapshot()
      handle.dispose()
      await window.modalZoom.open()
      await window.galleryController.next()
      await window.modalZoom.close()
      return {
        sharedGallery: shared,
        closed: !window.modalZoom.getZoomedImage(),
      }
    })
  ).toEqual({ sharedGallery: true, closed: true })
})

test('direct instance mutations publish settled collection state and stale disposal stays inert', async ({
  page,
}) => {
  await fixture(page)
  expect(
    await page.evaluate(async () => {
      const { createGallery } = await window.loadEntry('gallery')
      const old = window.galleryController
      old.dispose()
      const gallery = createGallery(window.modalZoom)
      old.dispose()
      const counts: number[] = []
      gallery.subscribe(() => counts.push(gallery.getSnapshot().images.length))
      const extra = document.createElement('img')
      extra.src = '/images/image-1.jpg'
      document.body.append(extra)
      window.modalZoom.attach(extra)
      await Promise.resolve()
      window.modalZoom.detach(extra)
      await Promise.resolve()
      gallery.dispose()
      gallery.subscribe(() => {
        throw Error('Disposed subscription retained')
      })
      window.modalZoom.attach(extra)
      await Promise.resolve()
      return {
        counts,
        stable: createGallery(window.modalZoom) !== gallery,
      }
    })
  ).toEqual({ counts: [3, 2], stable: true })
})
