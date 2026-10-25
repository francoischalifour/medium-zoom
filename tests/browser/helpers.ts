import { expect, type Page, type Locator } from '@playwright/test'

interface Bundle {
  format: 'esm' | 'umd'
  file: string
  injectsStyles: boolean
}

export const bundles = {
  defaultUmd: { format: 'umd', file: 'medium-zoom.min.js', injectsStyles: true },
  pureUmd: { format: 'umd', file: 'pure/medium-zoom.min.umd.js', injectsStyles: false },
  defaultEsm: { format: 'esm', file: 'medium-zoom.esm.js', injectsStyles: true },
  pureEsm: { format: 'esm', file: 'pure/index.js', injectsStyles: false },
} satisfies Record<string, Bundle>

export type BundleName = keyof typeof bundles
export type Distribution = 'baseline' | 'package'

interface PackageOptions {
  distribution?: Distribution
  bundle?: BundleName
}

export async function preparePage(
  page: Page,
  {
    body = '<img id="image" src="/images/image-1.jpg" width="160" alt="Zoom fixture">',
    bodyStyle = 'margin:32px;min-height:200vh',
  }: { body?: string; bodyStyle?: string } = {}
) {
  await page.goto('/')
  await page.setContent(`<!doctype html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    </head><body style="${bodyStyle}">${body}</body></html>`)
  await decodeImages(page.locator('img'))
}

export async function loadBundle(
  page: Page,
  { distribution = 'package', bundle = 'defaultUmd' }: PackageOptions = {}
) {
  const { file, format } = bundles[bundle]
  const url = `/${distribution}/dist/${file}`
  if (format === 'esm') {
    await page.evaluate(async url => {
      const { default: mediumZoom } = (await import(url)) as typeof import('../../src/medium-zoom')
      window.mediumZoom = mediumZoom
    }, url)
  } else await page.addScriptTag({ url })
}

export async function loadZoomFixture(page: Page, options: PackageOptions = {}) {
  await preparePage(page)
  await loadBundle(page, options)
  await page.evaluate(() => {
    window.zoom = window.mediumZoom('#image')
  })
}

export async function decodeImages(images: Locator) {
  await images.evaluateAll(images =>
    Promise.all(images.map(image => (image as HTMLImageElement).decode()))
  )
}

export async function finishAnimations(page: Page) {
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map(animation => animation.finished))
  )
}

export async function dismissZoom(
  page: Page,
  {
    via = 'keyboard',
  }: {
    via?: 'keyboard' | 'scroll' | 'template'
  } = {}
) {
  const dismiss = {
    keyboard: () => page.keyboard.press('Escape'),
    scroll: () => page.mouse.wheel(0, 100),
    template: () => page.locator('svg[data-zoom-close]').click(),
  }
  await dismiss[via]()
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
}

export async function openImage(
  page: Page,
  image: Locator,
  {
    via = 'click',
  }: {
    via?: 'click' | 'tap'
  } = {}
) {
  await image.evaluate(image => {
    delete document.documentElement.dataset.opened
    image.addEventListener(
      'medium-zoom:opened',
      () => {
        document.documentElement.dataset.opened = 'true'
      },
      { once: true }
    )
  })
  await image[via]()
  await expect(page.locator('html')).toHaveAttribute('data-opened', 'true')
  await expect(page.locator('.medium-zoom-image--opened').first()).toBeVisible()
}

export function observeErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  return errors
}

export function acceptAlerts(page: Page) {
  const alerts: string[] = []
  page.on('dialog', async dialog => {
    alerts.push(dialog.message())
    await dialog.accept()
  })
  return alerts
}
