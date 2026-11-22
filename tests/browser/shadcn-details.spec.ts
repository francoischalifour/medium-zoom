import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

import { dismissZoom, observeErrors } from './helpers.ts'

// The composable component's own behavior, beyond what the shared shadcn suites cover.
const page = (query = '') => `/composition/details.html${query}`
const changes = (page: Page) => page.getByRole('status', { name: 'Changes' })
const trigger = (page: Page) =>
  page.getByRole('button', { name: 'Zoom image: Ocean sunset' })

test('onOpenChange reports why the zoom opened and closed, with the event', async ({
  page: tab,
}) => {
  const errors = observeErrors(tab)
  await tab.goto(page())
  await trigger(tab).click()
  await expect(tab.getByRole('dialog')).toBeVisible()
  await tab.keyboard.press('Escape')
  await expect(tab.getByRole('dialog')).toHaveCount(0)
  await trigger(tab).click()
  await expect(tab.getByRole('dialog')).toBeVisible()
  await tab.locator('dialog img.medium-zoom-image--opened').first().click()
  await expect(tab.getByRole('dialog')).toHaveCount(0)
  await trigger(tab).click()
  await expect(tab.getByRole('dialog')).toBeVisible()
  await tab
    .getByRole('button', { name: 'Replace source' })
    .evaluate(button => (button as HTMLButtonElement).click())
  await expect(tab.getByRole('dialog')).toHaveCount(0)
  await expect(changes(tab)).toHaveText(
    [
      'true trigger-press click',
      'false escape-key keydown',
      'true trigger-press click',
      'false image-press click',
      'true trigger-press click',
      'false source-change none',
    ].join(' | ')
  )
  expect(errors).toEqual([])
})

test('defaultOpen opens an uncontrolled zoom once mounted', async ({
  page: tab,
}) => {
  await tab.goto(page('?open'))
  await expect(tab.getByRole('dialog', { name: 'Ocean sunset' })).toBeVisible()
  await dismissZoom(tab)
  await expect(changes(tab)).toHaveText('false escape-key keydown')
  await expect(trigger(tab)).toBeFocused()
})

test('switching between controlled and uncontrolled warns once', async ({
  page: tab,
}) => {
  const warnings: string[] = []
  tab.on('console', message => {
    if (message.type() === 'error') {
      warnings.push(message.text())
    }
  })
  await tab.goto(page())
  await expect(trigger(tab)).toBeVisible()
  const toggle = tab.getByRole('button', { name: 'Switch control' })
  await toggle.click()
  await toggle.click()
  await expect
    .poll(() => warnings)
    .toEqual([
      expect.stringContaining('changed from uncontrolled to controlled'),
    ])
})

test('the open zoom has no accessibility violations', async ({ page: tab }) => {
  await tab.goto(page())
  await trigger(tab).click()
  const dialog = tab.getByRole('dialog', { name: 'Ocean sunset' })
  await expect(dialog).toMatchAriaSnapshot(`
    - dialog "Ocean sunset":
      - img "Ocean sunset"
  `)
  const results = await new AxeBuilder({ page: tab })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
})
