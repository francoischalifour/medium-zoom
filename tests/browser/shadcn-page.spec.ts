import { test, expect, type Page } from '@playwright/test'
import { decodeImages, dismissZoom, openImage } from './helpers.ts'

const demo = '/examples/shadcn/'
const registry = 'https://medium-zoom.francoischalifour.com/r/image-zoom.json'

async function ready(page: Page) {
  await page.goto(demo)
  await expect(page.getByRole('heading', { name: /Your images,/ })).toBeVisible()
  await decodeImages(
    page.getByRole('article', { name: 'Landscape example', exact: true }).locator('.demo-stage img')
  )
}

test('built page hydrates and presents the component without test controls', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await ready(page)
  await expect(page.getByRole('button', { name: 'Inspect ref', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Hide with Activity', exact: true })).toHaveCount(0)
  const install = await page.locator('.hero-install').boundingBox()
  expect(install!.y + install!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  await page.screenshot({ path: testInfo.outputPath('page-light.png'), fullPage: true })
  const image = page
    .getByRole('article', { name: 'Landscape example', exact: true })
    .locator('.demo-stage img')
  await openImage(page, image, { trigger: image.locator('..') })
  await dismissZoom(page)
  expect(errors).toEqual([])
})

async function presented(page: Page, label: string) {
  const card = page.getByRole('article', { name: `${label} example`, exact: true })
  await expect
    .poll(async () => {
      const bounds = await card.boundingBox()
      const rail = await page
        .getByRole('region', { name: 'Image zoom examples', exact: true })
        .locator('.example-rail')
        .boundingBox()
      return bounds!.x >= rail!.x - 2 && bounds!.x + bounds!.width <= rail!.x + rail!.width + 2
    })
    .toBe(true)
  return card
}

test('all six cards open and contain their own matching code', async ({ page }) => {
  await ready(page)
  for (const [label, alt] of [
    ['Landscape', 'Ocean sunset'],
    ['Portrait', 'Cat in the garden'],
    ['Mountains', 'Denali at sunrise'],
    ['Earth', 'Earth from space'],
    ['Architecture', 'Roosevelt Arch'],
    ['Aurora', 'Aurora over Yellowstone'],
  ]) {
    await page
      .getByRole('article', { name: `${label} example`, exact: true })
      .scrollIntoViewIfNeeded()
    const card = await presented(page, label)
    const image = card.locator('.demo-stage img')
    await expect(image).toHaveAttribute('alt', alt)
    await decodeImages(image)
    await openImage(page, image, { trigger: image.locator('..') })
    await dismissZoom(page)
    await card.getByRole('tab', { name: 'Code', exact: true }).click()
    await expect(card.getByRole('tabpanel')).toContainText(alt)
    await card.getByRole('tab', { name: 'Preview', exact: true }).click()
  }
})

test('horizontal examples stop at both ends and retain independent card state', async ({
  page,
}) => {
  await ready(page)
  const previous = page
    .getByRole('region', { name: 'Image zoom examples', exact: true })
    .getByRole('button', { name: 'Previous example', exact: true })
  const next = page
    .getByRole('region', { name: 'Image zoom examples', exact: true })
    .getByRole('button', { name: 'Next example', exact: true })
  await expect(previous).toBeDisabled()
  const landscape = await presented(page, 'Landscape')
  await landscape.getByRole('tab', { name: 'Code', exact: true }).click()
  await next.click()
  await presented(page, 'Portrait')
  await next.click()
  await presented(page, 'Mountains')
  for (let step = 0; step < 6 && !(await next.isDisabled()); step++) await next.press('Enter')
  await expect(next).toBeDisabled()
  for (let step = 0; step < 6 && !(await previous.isDisabled()); step++)
    await previous.press('Enter')
  await presented(page, 'Landscape')
  await expect(previous).toBeDisabled()
  await expect(landscape.getByRole('tab', { name: 'Code', exact: true })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await expect(
    page.getByRole('region', { name: 'Image zoom examples', exact: true }).locator('.example-card')
  ).toHaveCount(6)
  await expect(
    page.getByRole('region', { name: 'Image zoom examples', exact: true }).locator('.example-rail')
  ).toHaveCSS('scrollbar-width', 'none')
  // Native focus scrolling can traverse the finite rail and leave it normally.
  await landscape.getByRole('tab', { name: 'Code', exact: true }).focus()
  for (let step = 0; step < 40; step++) {
    await page.keyboard.press('Tab')
    if (
      !(await page
        .getByRole('region', { name: 'Image zoom examples', exact: true })
        .evaluate(element => element.contains(document.activeElement)))
    )
      break
  }
  expect(
    await page
      .getByRole('region', { name: 'Image zoom examples', exact: true })
      .evaluate(element => element.contains(document.activeElement))
  ).toBe(false)
})

test('keyboard navigation keeps focus at both rail boundaries', async ({ page }) => {
  await ready(page)
  const next = page
    .getByRole('region', { name: 'Image zoom examples', exact: true })
    .getByRole('button', { name: 'Next example', exact: true })
  const previous = page
    .getByRole('region', { name: 'Image zoom examples', exact: true })
    .getByRole('button', { name: 'Previous example', exact: true })
  await next.focus()
  for (let step = 0; step < 6 && !(await next.isDisabled()); step++)
    await page.keyboard.press('Enter')
  await expect(next).toBeDisabled()
  await expect(next).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(next).toBeFocused()
  await previous.focus()
  for (let step = 0; step < 6 && !(await previous.isDisabled()); step++)
    await page.keyboard.press('Enter')
  await expect(previous).toBeDisabled()
  await expect(previous).toBeFocused()
})

test('keyboard tabs and package manager selection copy the correct command', async ({ page }) => {
  await ready(page)
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.documentElement.dataset.copied = text
        },
      },
    })
  })
  const landscape = page.getByRole('article', { name: 'Landscape example', exact: true })
  await landscape.getByRole('tab', { name: 'Preview', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(landscape.getByRole('tab', { name: 'Code', exact: true })).toBeFocused()
  await expect(landscape.getByRole('tab', { name: 'Code', exact: true })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await page.getByRole('button', { name: 'Copy landscape code', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-copied', /import \{ ImageZoom \}/)
  expect(await page.locator('html').getAttribute('data-copied')).toContain(
    'src="https://medium-zoom.francoischalifour.com/assets/images/ocean-sunset.jpg"'
  )
  await expect(page.getByRole('status').filter({ hasText: 'Copied to clipboard' })).toBeVisible()
  await page.locator('.hero-install').getByRole('radio', { name: 'npm', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(
    page.locator('.hero-install').getByRole('radio', { name: 'pnpm', exact: true })
  ).toBeChecked()
  await page
    .locator('.hero-install')
    .getByRole('button', { name: 'Copy install command', exact: true })
    .click()
  await expect(page.locator('html')).toHaveAttribute(
    'data-copied',
    `pnpm dlx shadcn@latest add ${registry}`
  )
  await page.getByRole('button', { name: 'Copy usage code', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-copied', /className="rounded-lg"/)
})

test('clipboard denial produces an actionable message', async ({ page }) => {
  await ready(page)
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('Clipboard permission denied')
        },
      },
    })
  })
  await page
    .locator('.hero-install')
    .getByRole('button', { name: 'Copy install command', exact: true })
    .click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Select the text to copy.' })
  ).toBeVisible()
})

test('dark mode carries into the enlarged image overlay', async ({ page }, testInfo) => {
  await ready(page)
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click()
  await expect(page.locator('html')).toHaveClass('dark')
  await page.screenshot({ path: testInfo.outputPath('page-dark.png'), fullPage: true })
  const image = page
    .getByRole('article', { name: 'Landscape example', exact: true })
    .locator('.demo-stage img')
  await openImage(page, image, { trigger: image.locator('..') })
  await expect(page.locator('.medium-zoom-overlay')).toHaveCSS(
    'background-color',
    'rgb(17, 17, 19)'
  )
  await dismissZoom(page)
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click()
  await expect(page.locator('html')).not.toHaveClass('dark')
})

test('small screens keep code and the API table inside their scroll containers', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await ready(page)
  const install = await page.locator('.hero-install').boundingBox()
  expect(install!.y + install!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  await page.screenshot({ path: testInfo.outputPath('page-mobile.png'), fullPage: true })
  const landscape = page.getByRole('article', { name: 'Landscape example', exact: true })
  await landscape.getByRole('tab', { name: 'Code', exact: true }).click()
  await expect(landscape.getByRole('tabpanel')).toContainText('<ImageZoom')
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
  await page.setViewportSize({ width: 320, height: 740 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true)
})
