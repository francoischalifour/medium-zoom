import { test, expect } from '@playwright/test'

import { decodeImages, observeErrors, finishAnimations, openImage } from './helpers'

test('shadcn compound controls reuse the headless model without stock UI', async ({ page }) => {
  const errors = observeErrors(page)
  await page.goto('/composition/')
  const trigger = page.getByRole('button', { name: 'Open Ocean sunset', exact: true })
  await expect(trigger).toBeEnabled()
  await decodeImages(page.locator('.photos img'))
  await openImage(page, trigger.locator('img'), { via: 'keyboard', trigger })
  await expect(page.getByRole('dialog', { name: 'Ocean sunset' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('1 / 3')
  await expect(page.locator('.medium-zoom-gallery')).toHaveCount(0)
  await finishAnimations(page)
  const host = await page.locator('dialog').evaluate(node => {
    node.dataset.identity = 'react-owned'
    return node.dataset.identity
  })
  expect(host).toBe('react-owned')
  await page.getByRole('button', { name: 'Next photograph' }).click()
  await expect(page.getByRole('status')).toHaveText('2 / 3')
  await expect(page.getByRole('dialog', { name: 'Floral skateboard' })).toHaveAttribute(
    'data-identity',
    'react-owned'
  )
  await expect(page.getByRole('dialog').getByRole('img')).toHaveCount(1)
  expect(
    await page
      .locator('dialog')
      .evaluate(
        node =>
          node
            .getAnimations({ subtree: true })
            .filter(animation => animation.playState === 'running').length
      )
  ).toBe(0)
  await page.screenshot({ path: test.info().outputPath('gallery.png') })
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('status')).toHaveText('3 / 3')
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(trigger).toBeFocused()
  expect(errors).toEqual([])
})

test('Strict Mode and unmounting release the React view and session before remounting', async ({
  page,
}) => {
  const errors = observeErrors(page)
  await page.goto('/composition/')
  const trigger = page.getByRole('button', { name: 'Open Ocean sunset', exact: true })
  await expect(trigger).toBeEnabled()
  await decodeImages(page.locator('.photos img'))
  await trigger.click()
  await expect(page.getByRole('status')).toHaveText('1 / 3')
  await page
    .getByRole('button', { name: 'Unmount gallery' })
    .evaluate(button => (button as HTMLButtonElement).click())
  await expect(page.locator('dialog,.photo-toolbar,.medium-zoom-image--opened')).toHaveCount(0)
  await page.getByRole('button', { name: 'Mount gallery' }).click()
  await expect(trigger).toBeEnabled()
  await trigger.click()
  await expect(page.getByRole('status')).toHaveText('1 / 3')
  await page.getByRole('button', { name: 'Next photograph' }).click()
  await expect(page.getByRole('status')).toHaveText('2 / 3')
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
  expect(errors).toEqual([])
})
