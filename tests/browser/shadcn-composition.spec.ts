import { execFileSync } from 'node:child_process'
import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { decodeImages, dismissZoom, observeErrors, openImage, finishAnimations } from './helpers.ts'

const demo = '/examples/shadcn/playground.html?compound'
const oceanName = 'Open composed ocean'
const boardName = 'Zoom image: Composed skateboard'
async function ready(page: Page) {
  await page.goto(demo)
  await decodeImages(page.locator('.gallery img'))
}
async function activate(page: Page, name: string) {
  await page
    .getByRole('button', { name, exact: true })
    .evaluate(button => (button as HTMLButtonElement).click())
}

test('namespace parts hydrate server markup and forward native element refs', async ({ page }) => {
  const errors = observeErrors(page)
  const markup = execFileSync('bun', ['examples/shadcn/tests/ssr.tsx', '--compound'], {
    encoding: 'utf8',
  })
  await page.route('**/playground.html?compound', async route => {
    const response = await route.fetch()
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        '<div id="root"></div>',
        `<div id="root">${markup}</div>`
      ),
    })
  })
  await ready(page)
  await page.getByRole('button', { name: 'Inspect part refs' }).click()
  await expect(page.getByRole('status', { name: 'Part refs' })).toHaveText('BUTTON IMG')
  await page.getByRole('button', { name: oceanName }).focus()
  await page.keyboard.press('Space')
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  await expect(page.getByRole('status', { name: 'Controlled requests' })).toHaveText('[true]')
  await dismissZoom(page)
  await expect(page.getByRole('status', { name: 'Controlled requests' })).toHaveText('[true,false]')
  expect(errors).toEqual([])
})

for (const dismissal of ['Escape', 'click', 'scroll']) {
  test(`uncontrolled parts report opening and ${dismissal} dismissal once`, async ({ page }) => {
    await ready(page)
    const trigger = page.getByRole('button', { name: boardName })
    await openImage(page, trigger.locator('img'), { trigger })
    if (dismissal === 'Escape') await page.keyboard.press('Escape')
    else if (dismissal === 'click') await page.locator('.medium-zoom-image--opened').click()
    else await page.mouse.wheel(0, 200)
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
    await expect(page.getByRole('status', { name: 'Uncontrolled changes' })).toHaveText(
      '[true,false]'
    )
  })
}

test('controlled prop changes do not echo callbacks and user dismissal requests a change', async ({
  page,
}) => {
  await ready(page)
  await page.getByRole('button', { name: 'Open externally' }).click()
  await expect(page.locator('.medium-zoom-overlay')).toHaveCSS(
    'background-color',
    'rgb(238, 238, 238)'
  )
  await expect(page.getByRole('status', { name: 'Controlled requests' })).toHaveText('[]')
  await activate(page, 'Close externally')
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  await expect(page.getByRole('status', { name: 'Controlled requests' })).toHaveText('[]')
  await page.getByRole('button', { name: oceanName }).click()
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  await dismissZoom(page)
  await expect(page.getByRole('status', { name: 'Controlled requests' })).toHaveText('[true,false]')
})

test('controlled requests can be declined and trigger handlers can cancel activation', async ({
  page,
}) => {
  await ready(page)
  await page.getByRole('button', { name: 'Decline requests' }).click()
  for (let count = 1; count <= 3; count++) {
    await page.getByRole('button', { name: oceanName }).click()
    await expect(page.getByRole('status', { name: 'Controlled requests' })).toHaveText(
      JSON.stringify(Array(count).fill(true))
    )
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  }
  await page.getByRole('button', { name: 'Cancel trigger' }).click()
  await page.getByRole('button', { name: oceanName }).click()
  await expect(page.getByRole('status', { name: 'Controlled requests' })).toHaveText(
    '[true,true,true]'
  )
})

test('controlled opening waits for a mounted image', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Toggle image' }).click()
  await page.getByRole('button', { name: 'Open externally' }).click()
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  await page.getByRole('button', { name: 'Toggle image' }).click()
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  await dismissZoom(page)
})

for (const control of ['Replace source', 'Toggle disabled', 'Toggle image']) {
  test(`controlled zoom cleans up on ${control}`, async ({ page }) => {
    const errors = observeErrors(page)
    await ready(page)
    await page.getByRole('button', { name: oceanName }).click()
    await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
    await activate(page, control)
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
    await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(0)
    if (control !== 'Toggle image') {
      await expect(page.getByRole('status', { name: 'Controlled requests' })).toHaveText(
        '[true,false]'
      )
    }
    expect(errors).toEqual([])
  })
}

test('switching composed roots closes the previous controlled root', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: oceanName }).click()
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  await activate(page, boardName)
  await expect(page.locator('.medium-zoom-image--opened')).toHaveAttribute(
    'alt',
    'Composed skateboard'
  )
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(1)
  await expect(page.getByRole('status', { name: 'Controlled requests' })).toHaveText('[true,false]')
  await dismissZoom(page)
})

test('cancels an external open queued behind another root closing', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: boardName }).click()
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  await activate(page, 'Open externally')
  await activate(page, 'Close externally')
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
  await page.getByRole('button', { name: oceanName }).click()
  await expect(page.locator('.medium-zoom-image--opened')).toHaveAttribute('alt', 'Composed ocean')
  await dismissZoom(page)
})

test('keeps a controlled zoom open when dismissal is declined', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Decline requests' }).click()
  const trigger = page.getByRole('button', { name: oceanName })
  await openImage(page, trigger.locator('img'), {
    trigger: page.getByRole('button', { name: 'Open externally' }),
  })
  await trigger.locator('img').evaluate(image => {
    image.addEventListener(
      'medium-zoom:opened',
      () => ((image as HTMLElement).dataset.reopened = 'true'),
      { once: true }
    )
  })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('status', { name: 'Controlled requests' })).toHaveText('[false]')
  await expect(trigger.locator('img')).toHaveAttribute('data-reopened', 'true')
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(1)
  await activate(page, 'Close externally')
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test('initial controlled open survives Strict Mode effect replay', async ({ page }) => {
  const errors = observeErrors(page)
  await page.goto(`${demo}&open`)
  await expect(page.locator('.medium-zoom-image--opened')).toBeVisible()
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(1)
  await expect(page.getByRole('status', { name: 'Controlled requests' })).toHaveText('[]')
  await dismissZoom(page)
  await expect(page.getByRole('status', { name: 'Controlled requests' })).toHaveText('[false]')
  expect(errors).toEqual([])
})

test('the default trigger name follows changes to image alt text', async ({ page }) => {
  await ready(page)
  await page.getByRole('button', { name: 'Rename skateboard' }).click()
  const trigger = page.getByRole('button', { name: 'Zoom image: Floral skateboard', exact: true })
  await expect(trigger).toBeVisible()
  await trigger.click()
  await expect(page.locator('.medium-zoom-image--opened')).toHaveAttribute(
    'alt',
    'Floral skateboard'
  )
  await dismissZoom(page)
})

test('the published composition and controlled examples work as documented', async ({ page }) => {
  await page.goto('/react')
  await page.getByRole('tab', { name: 'Composed', exact: true }).click()
  const example = page.locator('#usage [role="tabpanel"]')
  await expect(example.locator('code')).toContainText('ImageZoom.Root')
  const composed = example.getByRole('button', { name: 'View photo: Denali at sunrise' })
  await decodeImages(composed.locator('img'))
  await composed.click()
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  await dismissZoom(page)
  await page.getByRole('tab', { name: 'Controlled', exact: true }).click()
  await expect(example.locator('code')).toContainText('onOpenChange={setOpen}')
  await decodeImages(example.locator('img'))
  await example.getByRole('button', { name: 'Open image', exact: true }).click()
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  await dismissZoom(page)
})

test('composed and controlled examples are accessible in both themes', async ({ page }) => {
  await page.goto('/react')
  for (const theme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme })
    for (const name of ['Composed', 'Controlled']) {
      await page.locator('#usage').getByRole('tab', { name, exact: true }).click()
      await finishAnimations(page)
      const results = await new AxeBuilder({ page })
        .include('#usage')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      expect(results.violations).toEqual([])
    }
  }
})
