import AxeBuilder from '@axe-core/playwright'

import snapshot from '../../website/src/npm-downloads.json'
import { test, expect } from './website-fixture'

const format = (value: number) => new Intl.NumberFormat('en-US').format(value)
const compact = (value: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
const nextDate = new Date(`${snapshot.end}T00:00:00Z`)
nextDate.setUTCDate(nextDate.getUTCDate() + 1)
const nextDay = nextDate.toISOString().slice(0, 10)

for (const path of ['/website.html', '/react']) {
  test(`${path} serves the reported downloads without JavaScript`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    try {
      const page = await context.newPage()
      await page.goto(path)
      const stats = page.locator('.monthly-downloads')
      await expect(stats.getByRole('link')).toHaveAccessibleName(
        `${compact(snapshot.monthly)} monthly downloads on npm`
      )
      await expect(stats.getByRole('link')).toHaveAttribute(
        'title',
        `${format(snapshot.monthly)} downloads over the last 30 completed days`
      )
      await expect(stats.locator('.download-date')).toHaveCount(0)
    } finally {
      await context.close()
    }
  })
}

test('new npm reports refresh the monthly count', async ({ page }) => {
  const clock = new Date(`${nextDay}T12:00:00Z`)
  clock.setUTCDate(clock.getUTCDate() + 1)
  await page.clock.setFixedTime(clock)
  await page.route('https://api.npmjs.org/downloads/point/**', route =>
    route.fulfill({
      json: {
        package: 'medium-zoom',
        downloads: 420_000,
        start: new Date(Date.parse(nextDay) - 29 * 86_400_000).toISOString().slice(0, 10),
        end: nextDay,
      },
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  )
  await page.goto('/website.html')
  const stats = page.locator('.monthly-downloads')
  await expect(stats.getByRole('link')).toHaveAccessibleName(
    `${compact(420_000)} monthly downloads on npm`
  )
  await expect(stats).toContainText('420K monthly downloads on npm')
})

for (const failure of ['unavailable', 'incomplete', 'older'] as const) {
  test(`an ${failure} npm report preserves the verified count`, async ({ page }) => {
    const clock = new Date(`${nextDay}T12:00:00Z`)
    clock.setUTCDate(clock.getUTCDate() + 1)
    await page.clock.setFixedTime(clock)
    await page.route('https://api.npmjs.org/downloads/**', route => {
      if (failure === 'unavailable') {
        return route.fulfill({ status: 503, body: 'Unavailable' })
      }
      return route.fulfill({
        json: {
          package: 'medium-zoom',
          downloads: failure === 'incomplete' ? null : 420_000,
          start: new Date(Date.parse(nextDay) - 29 * 86_400_000).toISOString().slice(0, 10),
          end: failure === 'older' ? '2016-07-26' : nextDay,
        },
        headers: { 'Access-Control-Allow-Origin': '*' },
      })
    })
    await page.goto('/website.html')
    const stats = page.locator('.monthly-downloads')
    await expect(stats.getByRole('link')).toHaveAccessibleName(
      `${compact(snapshot.monthly)} monthly downloads on npm`
    )
    await expect(stats).toContainText(`${compact(snapshot.monthly)} monthly downloads on npm`)
    await page.getByRole('link', { name: 'Start building', exact: true }).click()
    await expect(page.locator('#usage-title')).toBeFocused()
  })
}

for (const theme of ['light', 'dark'] as const) {
  test(`download statistics remain accessible on mobile in ${theme} mode`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await page.goto('/website.html')
    await page.locator('.monthly-downloads').scrollIntoViewIfNeeded()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const result = await new AxeBuilder({ page }).include('.monthly-downloads').analyze()
    expect(result.violations).toEqual([])
    await page.screenshot({ path: `/tmp/medium-zoom-downloads-mobile-${theme}.png` })
  })
}
