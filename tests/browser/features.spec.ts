import { test, expect } from '@playwright/test'
import { preparePage, openImage } from './helpers'

type Feature = 'hdImage' | 'container' | 'template'
const combinations: Feature[][] = [
  [],
  ['hdImage'],
  ['container'],
  ['template'],
  ['hdImage', 'container', 'template'],
  ['template', 'container', 'hdImage'],
]

for (const features of combinations) {
  test(`composed factory: ${features.join(', ') || 'core'}`, async ({ page }) => {
    await preparePage(page, {
      body: `<img id="image" src="/images/image-1.jpg" width="160" data-zoom-src="/images/image-2.jpg?hd" alt="Zoom fixture">
        <template id="template"><div id="caption">Caption</div></template>`,
    })
    const requests: string[] = []
    page.on('request', request => requests.push(request.url()))
    await page.evaluate(async names => {
      const coreUrl = '/package/dist/core/index.mjs'
      const featuresUrl = '/package/dist/features/index.mjs'
      const { createMediumZoom } = (await import(coreUrl)) as typeof import('../../src/core')
      const builtins = (await import(featuresUrl)) as typeof import('../../src/features')
      const factory = createMediumZoom({ features: names.map(name => builtins[name]()) })
      window.mediumZoom = factory
      window.zoom = factory('#image', {
        margin: 12,
        ...(names.includes('container') && {
          container: { width: 600, height: 400, left: 30, top: 40 },
        }),
        ...(names.includes('template') && { template: '#template' }),
      })
    }, features)
    await expect(page.locator('style')).toHaveCount(0)
    await page.addStyleTag({ url: '/package/dist/modern/style.css' })
    const options = await page.evaluate(() => window.zoom.getOptions())
    expect('container' in options).toBe(features.includes('container'))
    expect('template' in options).toBe(features.includes('template'))
    await openImage(page, page.locator('#image'))
    await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(
      features.includes('hdImage') ? 2 : 1
    )
    await expect(page.locator('#caption')).toHaveCount(features.includes('template') ? 1 : 0)
    expect(requests.some(url => url.includes('?hd'))).toBe(features.includes('hdImage'))
    if (features.includes('container')) {
      const rect = await page.locator('.medium-zoom-image--opened').last().boundingBox()
      expect(rect!.x + rect!.width / 2).toBeCloseTo(315, 0)
      expect(rect!.y + rect!.height / 2).toBeCloseTo(220, 0)
    }
    await page.evaluate(() => window.zoom.close())
    await expect(page.locator('.medium-zoom-overlay, #caption')).toHaveCount(0)
    await page.evaluate(() => {
      window.zoom.detach()
      window.zoom = window.zoom.clone({ margin: 24 }).attach('#image')
    })
    await openImage(page, page.locator('#image'))
    await expect(page.locator('#caption')).toHaveCount(features.includes('template') ? 1 : 0)
    await page.evaluate(() => window.zoom.close())
  })
}

test('factories and instances isolate options and pending image loads', async ({ page }) => {
  await preparePage(page)
  await page.route('**/pending.jpg', () => {})
  const result = await page.evaluate(async () => {
    const coreUrl = '/package/dist/core/index.mjs'
    const featuresUrl = '/package/dist/features/index.mjs'
    const { createMediumZoom } = (await import(coreUrl)) as typeof import('../../src/core')
    const { hdImage, template } = (await import(featuresUrl)) as typeof import('../../src/features')
    const full = createMediumZoom({ features: [hdImage(), template()] })
    const core = createMediumZoom()
    const image = document.querySelector<HTMLImageElement>('#image')!
    image.dataset.zoomSrc = '/pending.jpg'
    const first = full(image, { margin: 8 })
    const second = full({ margin: 24 })
    const plain = core({ margin: 48 })
    const opening = first.open()
    await first.close()
    await opening
    first.detach()
    second.attach(image)
    image.removeAttribute('data-zoom-src')
    await second.open()
    const result = {
      first: first.getZoomedImage(),
      second: second.getZoomedImage() === image,
      margins: [first, second, plain].map(zoom => zoom.getOptions().margin),
      coreOptions: plain.getOptions(),
    }
    await second.close()
    return result
  })
  expect(result).toEqual({
    first: null,
    second: true,
    margins: [8, 24, 48],
    coreOptions: { margin: 48, background: '#fff', scrollOffset: 40 },
  })
  await expect(page.locator('.medium-zoom-overlay, .medium-zoom-image--opened')).toHaveCount(0)
})

test('importing feature functions has no stylesheet side effect', async ({ page }) => {
  await preparePage(page)
  await page.evaluate(async () => {
    const url = '/package/dist/features/index.mjs'
    await import(url)
  })
  await expect(page.locator('style')).toHaveCount(0)
})

test('editing the configuration array does not change an existing factory', async ({ page }) => {
  await preparePage(page)
  const result = await page.evaluate(async () => {
    const coreUrl = '/package/dist/core/index.mjs'
    const featuresUrl = '/package/dist/features/index.mjs'
    const { createMediumZoom } = (await import(coreUrl)) as typeof import('../../src/core')
    const { container } = (await import(featuresUrl)) as typeof import('../../src/features')
    const features = [container()]
    const factory = createMediumZoom({ features })
    features.length = 0
    const zoom = factory({ container: { width: 600 } })
    zoom.update({ container: { top: 10 } })
    return zoom
      .clone()
      .update({ container: { left: 20 } })
      .getOptions().container
  })
  expect(result).toEqual({ width: 600, top: 10, left: 20 })
})

test('the full pure entry supports templates and HD images without injecting CSS', async ({
  page,
}) => {
  await preparePage(page, {
    body: `<img id="image" src="/images/image-1.jpg" width="160" data-zoom-src="/images/image-2.jpg" alt="Zoom">
    <template id="template"><div id="caption">Caption</div></template>`,
  })
  await page.evaluate(async () => {
    const url = '/package/dist/pure/index.mjs'
    const { default: mediumZoom } = (await import(url)) as typeof import('../../src/pure')
    window.zoom = mediumZoom('#image', { template: '#template' })
  })
  await expect(page.locator('style')).toHaveCount(0)
  await page.addStyleTag({ url: '/package/dist/style.css' })
  await openImage(page, page.locator('#image'))
  await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(2)
  await expect(page.locator('#caption')).toBeVisible()
  await page.evaluate(() => window.zoom.close())
  await expect(
    page.locator('#caption, .medium-zoom-overlay, .medium-zoom-image--opened')
  ).toHaveCount(0)
})
