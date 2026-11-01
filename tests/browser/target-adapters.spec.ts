import { test, expect } from '@playwright/test'

import { preparePage, loadBundle } from './helpers'

for (const modal of [false, true]) {
  test(`${modal ? 'modal' : 'body'} frames retain source coordinates, clone attributes and cleanup`, async ({
    page,
  }) => {
    await preparePage(page, {
      body: '<div style="margin-top:500px"><img id="image" src="/images/image-1.jpg" width="200" alt="Sunset" data-author="retained" style="transform:scale(.8)"></div>',
    })
    await page.addStyleTag({ url: '/experimental/dist/modern/style.css' })
    const result = await page.evaluate(async modal => {
      const core = '/experimental/dist/core/index.mjs',
        renderers = '/experimental/dist/renderers/index.mjs'
      const { createMediumZoom } = (await import(core)) as typeof import('../../src/core')
      const { dialog } = (await import(renderers)) as typeof import('../../src/renderers')
      const source = document.querySelector<HTMLImageElement>('#image')!
      window.scrollTo(0, 350)
      const before = source.getBoundingClientRect().toJSON()
      window.zoom = createMediumZoom(modal ? { renderer: dialog() } : {})(source)
      const opening = window.zoom.open()
      const clone = document.querySelector<HTMLImageElement>('.medium-zoom-image--opened')!
      const initial = clone.getBoundingClientRect().toJSON()
      const attributes = { id: clone.id, author: clone.dataset.author, alt: clone.alt }
      await opening
      await window.zoom.close()
      return {
        before,
        initial,
        attributes,
        transform: source.style.transform,
        removed: !document.querySelector('.medium-zoom-image--opened'),
      }
    }, modal)
    expect(result.initial.x).toBeCloseTo(result.before.x, 0)
    expect(result.initial.y).toBeCloseTo(result.before.y, 0)
    expect(result.initial.width).toBeCloseTo(result.before.width, 0)
    expect(result.attributes).toEqual({ id: '', author: 'retained', alt: 'Sunset' })
    expect(result.transform).toBe('scale(0.8)')
    expect(result.removed).toBe(true)
  })
}

test('picture source resolution stays with the adapter and leaves the original source intact', async ({
  page,
}) => {
  await preparePage(page, {
    body: '<picture><source srcset="/images/image-2.jpg" media="(min-width:1px)"><img id="image" src="/images/image-1.jpg" width="160" alt="Selected source"></picture>',
  })
  await loadBundle(page)
  expect(
    await page.evaluate(async () => {
      const source = document.querySelector<HTMLImageElement>('#image')!
      window.zoom = window.mediumZoom(source)
      await window.zoom.open()
      const clone = document.querySelector<HTMLImageElement>('.medium-zoom-image--opened')!
      const result = {
        selected: source.currentSrc,
        cloned: clone.src,
        original: source.getAttribute('src'),
      }
      await window.zoom.close()
      return result
    })
  ).toMatchObject({
    selected: expect.stringContaining('image-2.jpg'),
    cloned: expect.stringContaining('image-2.jpg'),
    original: '/images/image-1.jpg',
  })
})

for (const format of ['file', 'data'] as const) {
  test(`existing SVG ${format} images remain image-adapter targets`, async ({ page }) => {
    const source =
      format === 'file'
        ? '/images/crab.svg'
        : 'data:image/svg+xml,' +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400"><rect width="640" height="400" fill="coral"/></svg>'
          )
    await preparePage(page, {
      body: `<img id="image" src="${source}" width="160" alt="SVG image"><svg id="inline" width="40" height="40"><rect width="40" height="40"/></svg>`,
    })
    await loadBundle(page)
    await page.evaluate(async () => {
      window.zoom = window.mediumZoom('#image,#inline')
      await window.zoom.open()
    })
    await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(1)
    await expect(page.locator('#inline')).not.toHaveClass(/medium-zoom-image/)
    await expect(page.locator('.medium-zoom-image--opened')).toHaveCSS('transform', /matrix/)
    await page.evaluate(() => window.zoom.close())
    await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(0)
  })
}

test('a frame restores authored clipping when geometry drops its crop or resets', async ({
  page,
}) => {
  await preparePage(page)
  expect(
    await page.evaluate(async () => {
      const probe = '/composition/frame-probe.mjs'
      const { createImageFrame, fitTarget } = (await import(
        probe
      )) as typeof import('../experimental/frame-probe')
      const image = document
        .querySelector<HTMLImageElement>('#image')!
        .cloneNode() as HTMLImageElement
      image.removeAttribute('id')
      document.body.append(image)
      image.style.clipPath = 'inset(2px)'
      const frame = createImageFrame(image)
      const box = { left: 0, top: 0, width: 160, height: 100 },
        viewport = { left: 0, top: 0, width: 800, height: 600 }
      const clipped = fitTarget(
        {
          layout: box,
          painted: box,
          intrinsic: { width: 800, height: 500 },
          clip: { left: 10, top: 10, width: 140, height: 80 },
        },
        viewport
      )!
      const plain = fitTarget(
        { layout: box, painted: box, intrinsic: { width: 800, height: 500 } },
        viewport
      )!
      frame.apply(clipped)
      const cropped = image.style.clipPath
      frame.apply(plain)
      const restored = image.style.clipPath
      frame.apply(clipped)
      frame.reset()
      frame.dispose()
      frame.dispose()
      return { cropped, restored, reset: image.style.clipPath, connected: image.isConnected }
    })
  ).toEqual({
    cropped: 'inset(10px)',
    restored: 'inset(2px)',
    reset: 'inset(2px)',
    connected: false,
  })
})
