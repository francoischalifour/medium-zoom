import { expect, type Page, test } from '@playwright/test'

import { addModernStyles, preparePage } from './helpers'

declare global {
  interface Window {
    unbindTriggers: () => void
  }
}
async function fixture(page: Page) {
  await preparePage(page, {
    body: '<img id="first" src="/images/image-1.jpg" alt="Sunset" aria-label="Authored photograph" tabindex="3" width="160"><img id="second" src="/images/image-2.jpg" alt="Forest" width="160"><button id="native">Native<img id="wrapped" src="/images/image-1.jpg" alt="Wrapped" width="160"></button><div contenteditable><img id="editable" src="/images/image-1.jpg" alt="Editable" width="160"></div>',
  })
  await addModernStyles(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { dialog } = await window.loadEntry('renderers')
    const { bindZoomTriggers } = await window.loadEntry('triggers')
    window.modalZoom = createZoom('#first', { renderer: dialog() })
    window.unbindTriggers = bindZoomTriggers(window.modalZoom)
  })
}
for (const key of ['Enter', 'Space']) {
  test(`${key} opens a named content image and restores focus`, async ({ page }) => {
    await fixture(page)
    const source = page.locator('#first')
    await expect(source).toHaveAttribute('role', 'button')
    await expect(source).toHaveAttribute('tabindex', '3')
    await source.focus()
    await page.keyboard.press(key)
    await expect(page.getByRole('dialog')).toBeVisible()
    const image = page.getByRole('dialog').getByRole('img')
    await expect(image).toHaveAttribute('aria-label', 'Authored photograph')
    await expect(image).not.toHaveAttribute('role')
    await expect(image).not.toHaveAttribute('tabindex')
    await expect(image).not.toHaveAttribute('aria-haspopup')
    await page.keyboard.press('Escape')
    await expect(page.locator('dialog')).toHaveCount(0)
    await expect(source).toBeFocused()
  })
}

test('bindings follow attach/detach without replacing instance methods', async ({ page }) => {
  await fixture(page)
  expect(
    await page.evaluate(async () => {
      const { bindZoomTriggers } = await window.loadEntry('triggers')
      // oxlint-disable-next-line typescript/unbound-method -- Compare identity, never invoke as a method.
      const attach = window.modalZoom.attach
      const same = bindZoomTriggers(window.modalZoom) === window.unbindTriggers
      window.modalZoom.attach('#second')
      const role = document.querySelector('#second')!.getAttribute('role')
      window.modalZoom.detach('#second')
      const restored = !document.querySelector('#second')!.hasAttribute('role')
      window.unbindTriggers()
      return {
        same,
        role,
        restored,
        methods: attach === window.modalZoom.attach,
        firstRole: document.querySelector('#first')!.getAttribute('role'),
        label: document.querySelector('#first')!.getAttribute('aria-label'),
        tabindex: document.querySelector('#first')!.getAttribute('tabindex'),
      }
    })
  ).toEqual({
    same: true,
    role: 'button',
    restored: true,
    methods: true,
    firstRole: null,
    label: 'Authored photograph',
    tabindex: '3',
  })
  await page.locator('#first').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('an old unbind cannot remove a later binding', async ({ page }) => {
  await fixture(page)
  await page.evaluate(async () => {
    const { bindZoomTriggers } = await window.loadEntry('triggers')
    const old = window.unbindTriggers
    old()
    window.unbindTriggers = bindZoomTriggers(window.modalZoom)
    old()
    window.modalZoom.attach('#second')
  })
  await expect(page.locator('#second')).toHaveAttribute('role', 'button')
  await page.locator('#second').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
})

test('native and editable surfaces keep authored activation', async ({ page }) => {
  await fixture(page)
  await page.evaluate(() => {
    window.modalZoom.attach('#wrapped', '#editable')
    document.querySelector('#native')!.addEventListener('click', () => {
      void window.modalZoom.open({
        target: document.querySelector('#wrapped')!,
        trigger: document.querySelector('#native')!,
      })
    })
  })
  await expect(page.locator('#wrapped')).not.toHaveAttribute('role')
  await expect(page.locator('#editable')).not.toHaveAttribute('role')
  await page.locator('#native').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Wrapped' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#native')).toBeFocused()
})

test('protected keys and repeated activation do not reopen a scene', async ({ page }) => {
  await fixture(page)
  await page.locator('#first').focus()
  await page.keyboard.press('Control+Enter')
  await expect(page.locator('dialog')).toHaveCount(0)
  await page.evaluate(() =>
    document.querySelector('#first')!.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        repeat: true,
        bubbles: true,
      })
    )
  )
  await expect(page.locator('dialog')).toHaveCount(0)
  await page.keyboard.press('Enter')
  await expect(page.locator('dialog')).toHaveCount(1)
})

test('clone retains strategies but does not install an activation binding', async ({ page }) => {
  await fixture(page)
  await page.evaluate(() => {
    const clone = window.modalZoom.clone().attach('#second')
    if (document.querySelector('#second')!.hasAttribute('role')) {
      throw Error('Bindings propagated to clone')
    }
    window.modalZoom = clone
  })
  await page.evaluate(() => window.modalZoom.open())
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('authored image buttons keep their own click and keyboard behavior', async ({ page }) => {
  await fixture(page)
  await page.evaluate(() => {
    const image = document.querySelector<HTMLImageElement>('#second')!
    image.setAttribute('role', 'button')
    image.setAttribute('tabindex', '0')
    image.setAttribute('aria-label', 'Custom action')
    image.addEventListener('click', () => {
      document.body.dataset.action = 'clicked'
    })
    window.modalZoom.attach(image)
  })
  await expect(page.locator('#second')).not.toHaveAttribute('aria-haspopup')
  await page.locator('#second').click()
  await expect(page.locator('body')).toHaveAttribute('data-action', 'clicked')
  await expect(page.locator('dialog')).toHaveCount(0)
  await page.locator('#second').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('#second')).toHaveAttribute('aria-label', 'Custom action')
})

test('unbinding removes pointer activation and preserves author updates made while bound', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => {
    const source = document.querySelector('#first')!
    source.setAttribute('role', 'img')
    source.setAttribute('aria-haspopup', 'menu')
    source.setAttribute('tabindex', '7')
    window.unbindTriggers()
  })
  const source = page.locator('#first')
  await expect(source).toHaveAttribute('role', 'img')
  await expect(source).toHaveAttribute('aria-haspopup', 'menu')
  await expect(source).toHaveAttribute('tabindex', '7')
  await source.click()
  await source.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('authored cancellation runs before delegated pointer activation', async ({ page }) => {
  await fixture(page)
  await page.evaluate(() =>
    document.querySelector('#first')!.addEventListener('click', event => event.preventDefault())
  )
  await page.locator('#first').click()
  await expect(page.locator('dialog')).toHaveCount(0)
})
