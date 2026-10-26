import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './website-fixture'
import snapshot from '../../website/src/npm-downloads.json'

const format = (value: number) => new Intl.NumberFormat('en-US').format(value)
const nextDate = new Date(`${snapshot.end}T00:00:00Z`)
nextDate.setUTCDate(nextDate.getUTCDate() + 1)
const nextDay = nextDate.toISOString().slice(0, 10)

for (const path of ['/website.html', '/examples/shadcn/']) {
  test(`${path} serves the reported downloads without JavaScript`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    try {
      const page = await context.newPage()
      await page.goto(path)
      const stats = page.getByRole('region', { name: 'npm downloads' })
      await expect(stats.getByRole('link')).toHaveAccessibleName(
        `${format(snapshot.total)} total downloads on npm`
      )
      await expect(stats).toContainText(`${format(snapshot.weekly)} weekly downloads`)
      await expect(stats.locator('time')).toHaveAttribute('datetime', snapshot.end)
      await expect(stats.locator('.download-digits')).toHaveCSS('opacity', '1')
    } finally {
      await context.close()
    }
  })
}

test('new npm reports add only newly reported days to the total', async ({ page }) => {
  const clock = new Date(`${nextDay}T12:00:00Z`)
  clock.setUTCDate(clock.getUTCDate() + 1)
  await page.clock.setFixedTime(clock)
  await page.route('https://api.npmjs.org/downloads/point/**', route =>
    route.fulfill({
      json: {
        package: 'medium-zoom',
        downloads: 420_000,
        start: new Date(Date.parse(nextDay) - 6 * 86_400_000).toISOString().slice(0, 10),
        end: nextDay,
      },
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  )
  await page.route('https://api.npmjs.org/downloads/range/**', async route => {
    expect(route.request().url()).toContain(`${nextDay}:${nextDay}/medium-zoom`)
    await route.fulfill({
      json: {
        package: 'medium-zoom',
        start: nextDay,
        end: nextDay,
        downloads: [{ day: nextDay, downloads: 123 }],
      },
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  })
  await page.goto('/website.html')
  const stats = page.getByRole('region', { name: 'npm downloads' })
  await expect(stats.getByRole('link')).toHaveAccessibleName(
    `${format(snapshot.total + 123)} total downloads on npm`
  )
  await expect(stats).toContainText('420,000 weekly downloads')
  await expect(stats.locator('time')).toHaveAttribute('datetime', nextDay)
})

for (const failure of ['unavailable', 'incomplete', 'older'] as const) {
  test(`an ${failure} npm report preserves the verified count`, async ({ page }) => {
    const clock = new Date(`${nextDay}T12:00:00Z`)
    clock.setUTCDate(clock.getUTCDate() + 1)
    await page.clock.setFixedTime(clock)
    await page.route('https://api.npmjs.org/downloads/**', route => {
      if (failure === 'unavailable') return route.fulfill({ status: 503, body: 'Unavailable' })
      const point = route.request().url().includes('/point/')
      return route.fulfill({
        json: point
          ? {
              package: 'medium-zoom',
              downloads: 420_000,
              start: new Date(Date.parse(nextDay) - 6 * 86_400_000).toISOString().slice(0, 10),
              end: failure === 'older' ? '2016-07-26' : nextDay,
            }
          : { package: 'medium-zoom', start: nextDay, end: nextDay, downloads: [] },
        headers: { 'Access-Control-Allow-Origin': '*' },
      })
    })
    await page.goto('/website.html')
    const stats = page.getByRole('region', { name: 'npm downloads' })
    await expect(stats.getByRole('link')).toHaveAccessibleName(
      `${format(snapshot.total)} total downloads on npm`
    )
    await expect(stats.locator('time')).toHaveAttribute('datetime', snapshot.end)
    await page.getByRole('link', { name: 'Start building', exact: true }).click()
    await expect(page.locator('#usage-title')).toBeFocused()
  })
}

test('the download number waits until visible and animates through intermediate frames', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/website.html')
  const number = page.locator('.download-digits')
  const edgeFrames = await number.evaluate(async element => {
    window.scrollTo({
      top:
        element.getBoundingClientRect().top +
        scrollY -
        innerHeight +
        element.getBoundingClientRect().height / 4,
      behavior: 'instant',
    })
    const frames: number[] = []
    for (let index = 0; index < 20; index++) {
      await new Promise(requestAnimationFrame)
      frames.push(Number(getComputedStyle(element).opacity))
    }
    return frames
  })
  expect(edgeFrames.every(opacity => opacity === 0)).toBe(true)
  const revealFrames = await number.evaluate(async element => {
    element.scrollIntoView({ block: 'center', behavior: 'instant' })
    const frames: number[] = []
    for (let index = 0; index < 40; index++) {
      await new Promise(requestAnimationFrame)
      frames.push(Number(getComputedStyle(element).opacity))
    }
    return frames
  })
  expect(revealFrames.filter(opacity => opacity > 0 && opacity < 1).length).toBeGreaterThan(2)
  expect(revealFrames.at(-1)).toBe(1)
  for (let index = 1; index < revealFrames.length; index++) {
    expect(revealFrames[index]).toBeGreaterThanOrEqual(revealFrames[index - 1])
  }
})

test('the download number enters once and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/website.html')
  const stats = page.getByRole('region', { name: 'npm downloads' })
  await expect(stats.locator('.download-digits')).toHaveCSS('opacity', '0')
  await stats.scrollIntoViewIfNeeded()
  await expect(stats).toHaveAttribute('data-entered', 'true')
  await expect(stats.locator('.download-digits')).toHaveCSS('opacity', '1')
  await expect
    .poll(() =>
      stats.evaluate(
        element =>
          element
            .getAnimations({ subtree: true })
            .filter(animation => animation.playState === 'running').length
      )
    )
    .toBe(0)
  await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded()
  await stats.scrollIntoViewIfNeeded()
  expect(
    await stats.evaluate(
      element =>
        element
          .getAnimations({ subtree: true })
          .filter(animation => animation.playState === 'running').length
    )
  ).toBe(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(stats.locator('.download-digits')).toHaveCSS('animation-name', 'none')
})

test('the download number starts hidden before hydration and reveals without a flash', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1_440, height: 4_000 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  let resume!: () => void
  const hydration = new Promise<void>(resolve => {
    resume = resolve
  })
  await page.route('**/assets/*.js', async route => {
    await hydration
    await route.continue()
  })
  await page.goto('/website.html', { waitUntil: 'commit' })
  const number = page.locator('.download-digits')
  try {
    await expect(number).toBeInViewport()
    await expect(number).toHaveCSS('opacity', '0')
    await expect(page.locator('.download-stats')).toHaveAttribute('data-entered', 'false')
  } finally {
    resume()
  }
  await expect(page.locator('.download-stats')).toHaveAttribute('data-entered', 'true')
  await expect(number).toHaveCSS('opacity', '1')
})

for (const theme of ['light', 'dark'] as const) {
  test(`download statistics remain accessible on mobile in ${theme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await page.goto('/website.html')
    await page.getByRole('region', { name: 'npm downloads' }).scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const result = await new AxeBuilder({ page }).include('.download-stats').analyze()
    expect(result.violations).toEqual([])
    await page.screenshot({ path: `/tmp/medium-zoom-downloads-mobile-${theme}.png` })
  })
}
