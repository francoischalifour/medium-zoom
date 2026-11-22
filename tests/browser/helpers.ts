import { expect, type Locator, type Page, test } from '@playwright/test'

/** Positions agree within a CSS pixel: no one sees less, and devices snap to their own pixels. */
export const expectNear = (actual: number, expected: number) =>
  expect(
    Math.abs(actual - expected),
    `${actual} is within a pixel of ${expected}`
  ).toBeLessThanOrEqual(1)

/** Boxes, as `[left, top, width, height]` or any same-length list, agree within a pixel. */
export const expectSameBox = (actual: number[], expected: number[]) => {
  expect(actual).toHaveLength(expected.length)
  actual.forEach((value, index) => expectNear(value, expected[index]!))
}

interface Bundle {
  format: 'esm' | 'umd'
  file: string
  injectsStyles: boolean
}

export const bundles = {
  defaultUmd: {
    format: 'umd',
    file: 'medium-zoom.min.js',
    injectsStyles: true,
  },
  pureUmd: {
    format: 'umd',
    file: 'pure/medium-zoom.min.umd.js',
    injectsStyles: false,
  },
  defaultEsm: {
    format: 'esm',
    file: 'medium-zoom.esm.js',
    injectsStyles: true,
  },
  pureEsm: { format: 'esm', file: 'pure/index.js', injectsStyles: false },
} satisfies Record<string, Bundle>

export type BundleName = keyof typeof bundles
export type Distribution = 'baseline' | 'package'

/**
 * Which preset `loadBundle` serves from the package: the release `bundle`, or the
 * candidate modern preset. A project picks it with `metadata: { preset: 'modern' }`.
 */
export type Preset = 'release' | 'modern'
export const projectPreset = (): Preset =>
  test.info().project.metadata.preset ?? 'release'

interface PackageOptions {
  distribution?: Distribution
  bundle?: BundleName
  preset?: Preset
}

interface CandidateEntries {
  core: typeof import('../../src/zoom')
  loaders: typeof import('../../src/zoom/hd-image')
  viewport: typeof import('../../src/zoom/viewport')
  content: typeof import('../../src/zoom/content')
  triggers: typeof import('../../src/zoom/triggers')
  renderers: typeof import('../../src/zoom/dialog')
  transitions: typeof import('../../src/gallery/transition')
  gallery: typeof import('../../src/gallery')
}

declare global {
  interface Window {
    loadEntry<Name extends keyof CandidateEntries>(
      name: Name
    ): Promise<CandidateEntries[Name]>
    /** The zoom under test in strategy specs. */
    coreZoom: import('../../src/zoom').Zoom
    /** The zoom under test in composed-entry specs: `createZoom()` with a renderer. */
    modalZoom: import('../../src/zoom').ModalZoom
  }
}

/** The stylesheets that candidate entries leave to the application. */
export async function addModernStyles(page: Page) {
  for (const entry of ['modern', 'renderers', 'gallery']) {
    await page.addStyleTag({ url: `/experimental/dist/${entry}/style.css` })
  }
}

interface PageOptions {
  body?: string
  bodyStyle?: string
}

export async function preparePage(
  page: Page,
  {
    body = '<img id="image" src="/images/image-1.jpg" width="160" alt="Zoom fixture">',
    bodyStyle = 'margin:32px;min-height:200vh',
  }: PageOptions = {}
) {
  await page.goto('/fixture.html')
  await page.setContent(`<!doctype html><html><head>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    </head><body style="${bodyStyle}">${body}</body></html>`)
  await page.evaluate(() => {
    window.loadEntry = name => import(`/experimental/dist/${name}/index.mjs`)
  })
  await decodeImages(page.locator('img'))
}

export async function loadBundle(
  page: Page,
  {
    distribution = 'package',
    bundle = 'defaultUmd',
    preset = projectPreset(),
  }: PackageOptions = {}
) {
  if (distribution === 'package' && preset === 'modern') {
    await page.evaluate(async () => {
      const url = '/experimental/dist/modern/index.mjs'
      const { default: mediumZoom } = (await import(
        url
      )) as typeof import('../../src/preset/medium-zoom')
      window.mediumZoom = mediumZoom
    })
    return
  }
  const { file, format } = bundles[bundle]
  const url = `/${distribution}/dist/${file}`
  if (format === 'esm') {
    await page.evaluate(async url => {
      const { default: mediumZoom } = (await import(
        url
      )) as typeof import('medium-zoom')
      window.mediumZoom = mediumZoom
    }, url)
  } else {
    await page.addScriptTag({ url })
  }
}

export async function loadZoomFixture(
  page: Page,
  options: PackageOptions & PageOptions = {}
) {
  await preparePage(page, options)
  await loadBundle(page, options)
  await page.evaluate(() => {
    window.zoom = window.mediumZoom('#image')
  })
}

export async function decodeImages(images: Locator) {
  // Lazy images must finish source selection before WebKit can decode them reliably.
  await expect
    .poll(() =>
      images.evaluateAll(images =>
        images.every(image => {
          const photo = image as HTMLImageElement
          return photo.complete && photo.naturalWidth > 0
        })
      )
    )
    .toBe(true)
  await images.evaluateAll(images =>
    Promise.all(images.map(image => (image as HTMLImageElement).decode()))
  )
}

export async function finishAnimations(page: Page) {
  // Theme and layout changes can cancel transitions; both outcomes finish the wait.
  await page.evaluate(() =>
    Promise.allSettled(
      document
        .getAnimations()
        .filter(animation => animation.timeline === document.timeline)
        .map(animation => animation.finished)
    )
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
    trigger = image,
  }: {
    via?: 'click' | 'tap' | 'keyboard'
    trigger?: Locator
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
  if (via === 'keyboard') {
    await trigger.focus()
    await page.keyboard.press('Enter')
  } else {
    await trigger[via]()
  }
  await expect(page.locator('html')).toHaveAttribute('data-opened', 'true')
  await expect(page.locator('.medium-zoom-image--opened').first()).toBeVisible()
}

export function observeErrors(page: Page, { includeConsole = false } = {}) {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  if (includeConsole) {
    page.on('console', message => {
      if (message.type() === 'error') {
        errors.push(message.text())
      }
    })
  }
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
