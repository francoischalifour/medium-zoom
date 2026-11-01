import { test, expect, type Page } from '@playwright/test'

import type { ZoomSession } from '../../src/session'
import { loadZoomFixture } from './helpers'

declare global {
  interface Window {
    zoomSessions: ZoomSession[]
  }
}

async function fixture(page: Page) {
  await loadZoomFixture(page, {
    body: `
    <img id="image" src="/images/image-1.jpg" width="160" alt="Sunset">
    <img id="second" src="/images/image-2.jpg" width="160" alt="Skateboard">
    <img id="third" src="/images/image-1.jpg" width="160" alt="Ocean">
  `,
  })
  await page.evaluate(async () => {
    const path = '/experimental/dist/session/index.mjs'
    const { createZoomSession } = (await import(path)) as typeof import('../../src/session')
    window.zoomSessions = [
      window.zoom,
      window.mediumZoom('#second'),
      window.mediumZoom('#third'),
    ].map(zoom => createZoomSession(zoom))
  })
}

test('standalone sessions serialize legacy instances and the latest request wins', async ({
  page,
}) => {
  await fixture(page)
  expect(
    await page.evaluate(async () => {
      const [first, second, third] = window.zoomSessions
      await first!.open()
      await Promise.all([second!.open(), third!.open()])
      return window.zoomSessions.map(session => session.zoom.getZoomedImage()?.id || null)
    })
  ).toEqual([null, null, 'third'])
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(1)
  await page.evaluate(() => Promise.all(window.zoomSessions.map(session => session.dispose())))
  await expect(page.locator('.medium-zoom-image, .medium-zoom-overlay')).toHaveCount(0)
})

test('closing coalesces, and the same session can reopen after an in-flight close', async ({
  page,
}) => {
  await fixture(page)
  expect(
    await page.evaluate(async () => {
      const session = window.zoomSessions[0]!
      const opening = session.open()
      if (opening !== session.open()) {
        throw new Error('Duplicate opening work')
      }
      await opening
      const closing = session.close()
      if (closing !== session.close()) {
        throw new Error('Duplicate closing work')
      }
      const reopened = session.open()
      await Promise.all([closing, reopened])
      return session.zoom.getZoomedImage()?.id
    })
  ).toBe('image')
  await page.evaluate(() => window.zoomSessions[0]!.dispose())
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test('disposal cancels a queued opening and makes later openings inert', async ({ page }) => {
  await fixture(page)
  expect(
    await page.evaluate(async () => {
      const [first, second] = window.zoomSessions
      await first!.open()
      const queued = second!.open()
      await second!.dispose()
      await queued
      await second!.open()
      return window.zoomSessions.map(session => session.zoom.getZoomedImage())
    })
  ).toEqual([null, null, null])
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test('close waits for an Escape close already started inside legacy core', async ({ page }) => {
  await fixture(page)
  await page.evaluate(() => window.zoomSessions[0]!.open())
  await page.keyboard.press('Escape')
  expect(
    await page.evaluate(async () => {
      await window.zoomSessions[0]!.close()
      return document.querySelectorAll('.medium-zoom-overlay').length
    })
  ).toBe(0)
})

test('the standalone entry and accessibility feature share one document coordinator', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(async () => {
    const core = '/experimental/dist/core/index.mjs'
    const features = '/experimental/dist/features/index.mjs'
    const renderers = '/experimental/dist/renderers/index.mjs'
    const { createMediumZoom } = (await import(core)) as typeof import('../../src/core')
    const { accessibility } = (await import(features)) as typeof import('../../src/features')
    const { dialog } = (await import(renderers)) as typeof import('../../src/renderers')
    await window.zoomSessions[0]!.open()
    const zoom = createMediumZoom({ renderer: dialog(), features: [accessibility()] })('#second')
    await zoom.open()
    if (window.zoomSessions[0]!.zoom.getZoomedImage()) {
      throw new Error('Session was bundled twice')
    }
    await zoom.close()
    zoom.detach()
  })
  await expect(page.locator('.medium-zoom-overlay, dialog')).toHaveCount(0)
})
