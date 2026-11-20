import { test, expect, type Page } from '@playwright/test'

import { preparePage } from './helpers'

declare global {
  interface Window {
    configureDialog(options: import('../../src/medium-zoom').ZoomOptions): void
  }
}

async function fixture(page: Page, hd = false) {
  await preparePage(page, {
    body: `<button id="trigger" aria-label="Enlarge mountain"><img id="image" src="/images/image-1.jpg" width="160" alt="Mountain" ${hd ? 'data-zoom-src="/images/image-2.jpg"' : ''}></button>
      <button id="outside">Outside</button>
      <div id="container" style="position:fixed;left:10%;top:10%;width:80%;height:70%"></div>
      <template id="template"><button id="template-control" style="position:fixed;left:16px;top:16px">Details</button></template>`,
  })
  // Allow the mobile viewport metadata from setContent to settle before resize dismissal is armed.
  await page.evaluate(
    () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  )
  await page.addStyleTag({ url: '/experimental/dist/modern/style.css' })
  await page.evaluate(async () => {
    const { createZoom } = (await import(
      String('/experimental/dist/core/index.mjs')
    )) as typeof import('../../src/core')
    const { loadHdImage } = (await import(
      String('/experimental/dist/loaders/index.mjs')
    )) as typeof import('../../src/loaders')
    const { containerBounds } = (await import(
      String('/experimental/dist/viewport/index.mjs')
    )) as typeof import('../../src/viewport')
    const { templateContent } = (await import(
      String('/experimental/dist/content/index.mjs')
    )) as typeof import('../../src/content')
    const { dialog } = (await import(
      String('/experimental/dist/renderers/index.mjs')
    )) as typeof import('../../src/renderers')
    const { mountCloseControl } = await import(String('/experiments/gallery-controls.mjs'))
    let selected: import('../../src/medium-zoom').ZoomOptions = {}
    window.zoom = createZoom('#image', {
      renderer: dialog({
        content: view => {
          const close = mountCloseControl(view)
          const content = selected.template ? templateContent(selected.template)(view) : undefined
          return () => {
            content?.()
            close()
          }
        },
      }),
      loader: loadHdImage,
      viewport: (bounds, options) =>
        selected.container ? containerBounds(selected.container)(bounds, options) : bounds,
    })
    window.configureDialog = ({ container, template, ...options }) => {
      if (container !== undefined) {
        selected = { ...selected, container }
      }
      if (template !== undefined) {
        selected = { ...selected, template }
      }
      window.zoom.update(options)
    }
    document.querySelector('#trigger')!.addEventListener('click', event => {
      void window.zoom.open({
        target: document.querySelector('#image')!,
        trigger: event.currentTarget as HTMLElement,
      })
    })
    for (const type of ['open', 'opened', 'close', 'closed']) {
      window.zoom.on(type, () => {
        document.body.dataset.events = (document.body.dataset.events || '') + type + ','
      })
    }
  })
}

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`${reducedMotion}: modal keyboard activation, focus containment, Escape and return`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion })
    await fixture(page, true)
    await page.evaluate(() =>
      window.configureDialog({ template: '#template', container: '#container' })
    )
    await page.locator('#trigger').focus()
    await page.keyboard.press('Enter')
    const modal = page.getByRole('dialog', { name: 'Mountain' })
    await expect(modal).toBeVisible()
    await expect(page.locator('body')).toHaveAttribute('data-events', 'open,opened,')
    await expect(modal.locator('.medium-zoom-image--opened')).toHaveCount(2)
    await expect(modal.getByRole('img')).toHaveCount(1)
    await expect(modal.locator('#template-control')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Close image' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('#template-control')).toBeFocused()
    await page.keyboard.press('Tab')
    // Some engines cycle via the document viewport before returning to the first control.
    expect(
      await page.evaluate(
        () =>
          document.activeElement === document.body || !!document.activeElement?.closest('dialog')
      )
    ).toBe(true)
    await page.keyboard.press('Tab')
    expect(
      await page.locator('#outside').evaluate(element => element === document.activeElement)
    ).toBe(false)
    await page.keyboard.press('Escape')
    if (reducedMotion === 'no-preference') {
      await expect(modal).toHaveJSProperty('open', true)
    }
    await expect(modal).toHaveCount(0)
    await expect(page.locator('#trigger')).toBeFocused()
    await expect(page.locator('body')).toHaveAttribute('data-events', 'open,opened,close,closed,')
    await expect(page.locator('#image')).toBeVisible()
    await page.keyboard.press('Space')
    await expect(page.locator('body')).toHaveAttribute(
      'data-events',
      'open,opened,close,closed,open,opened,'
    )
    await page.getByRole('button', { name: 'Close image' }).click()
    await expect(page.locator('dialog')).toHaveCount(0)
    await expect(page.locator('#trigger')).toBeFocused()
  })
}

test('top layer and scrolled geometry with custom container, backdrop and image dismissal', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('#trigger')!.style.marginTop = '600px'
    window.scrollTo(0, 450)
    window.configureDialog({ container: '#container', margin: 12 })
    const cover = document.createElement('div')
    cover.style.cssText =
      'position:fixed;inset:0;z-index:2147483647;pointer-events:none;background:rgba(0,0,0,.1)'
    document.body.appendChild(cover)
  })
  const { original, initial } = await page.evaluate(() => {
    const original = document.querySelector('#image')!.getBoundingClientRect().toJSON()
    void window.zoom.open({ trigger: document.querySelector('#trigger')! })
    const initial = document.querySelector('dialog img')!.getBoundingClientRect().toJSON()
    return { original, initial }
  })
  expect(initial!.x).toBeCloseTo(original!.x, 0)
  expect(initial!.y).toBeCloseTo(original!.y, 0)
  await expect(page.locator('body')).toHaveAttribute('data-events', 'open,opened,')
  const box = await page.locator('dialog img').boundingBox()
  const container = await page.locator('#container').boundingBox()
  expect(box!.x + box!.width / 2).toBeCloseTo(container!.x + container!.width / 2, 0)
  expect(box!.y + box!.height / 2).toBeCloseTo(container!.y + container!.height / 2, 0)
  expect(await page.evaluate(() => document.querySelector('dialog')!.matches(':modal'))).toBe(true)
  await page.screenshot({ path: '.cache/dialog.png' })
  await page.locator('dialog img').click()
  await expect(page.locator('dialog')).toHaveCount(0)
  await page.evaluate(() => window.zoom.open())
  await page.locator('.medium-zoom-overlay').click({ position: { x: 2, y: 2 } })
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('Escape cancels pending HD loading and cleanup allows reopening', async ({ page }) => {
  await fixture(page, true)
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  await page.route('**/image-2.jpg', async route => {
    await gate
    await route.continue()
  })
  await page.locator('#trigger').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
  release()
  await page.unrouteAll({ behavior: 'wait' })
  await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(0)
  await expect(page.locator('body')).toHaveAttribute('data-events', 'open,close,closed,')
  await page.evaluate(() => window.zoom.open())
  await expect(page.locator('dialog img')).toHaveCount(2)
  await page.evaluate(() => window.zoom.close())
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('opening can be interrupted and closed listeners can reopen a fresh modal', async ({
  page,
}) => {
  await fixture(page)
  await page.addStyleTag({ content: '.medium-zoom-image { transition-duration: 1s !important }' })
  await page.evaluate(() => {
    void window.zoom.open()
    setTimeout(() => {
      void window.zoom.close()
    }, 80)
  })
  await expect(page.locator('dialog')).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(async () => {
    await window.zoom.open()
    window.zoom.on(
      'closed',
      () => {
        void window.zoom.open()
      },
      { once: true }
    )
    await window.zoom.close()
  })
  await expect(page.locator('dialog')).toHaveCount(1)
  await expect(page.locator('dialog')).toHaveJSProperty('open', true)
  await page.evaluate(() => window.zoom.close())
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('unsupported browsers reject without leaving an active session', async ({ page }) => {
  await fixture(page)
  expect(
    await page.evaluate(async () => {
      // oxlint-disable-next-line typescript/unbound-method -- Restore the native method after the capability test.
      const show = HTMLDialogElement.prototype.showModal
      HTMLDialogElement.prototype.showModal = undefined as unknown as typeof show
      try {
        await window.zoom.open()
        return false
      } catch {
        return window.zoom.getZoomedImage() === null
      } finally {
        HTMLDialogElement.prototype.showModal = show
      }
    })
  ).toBe(true)
  await expect(page.locator('dialog, .medium-zoom-overlay')).toHaveCount(0)
  await page.evaluate(async () => {
    await window.zoom.open()
    await window.zoom.close()
  })
})

test('template dialog forms use the animated close lifecycle', async ({ page }) => {
  await fixture(page)
  await page.evaluate(() => {
    document.querySelector('template')!.innerHTML =
      '<form method="dialog" style="position:fixed;top:16px;left:16px"><button>Done</button></form>'
    window.configureDialog({ template: '#template' })
  })
  await page.locator('#trigger').click()
  await expect(page.locator('body')).toHaveAttribute('data-events', 'open,opened,')
  await page.evaluate(() =>
    document
      .querySelector('dialog form')!
      .addEventListener('submit', event => event.preventDefault(), { once: true })
  )
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('dialog')).toHaveJSProperty('open', true)
  await expect(page.locator('body')).toHaveAttribute('data-events', 'open,opened,')
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('body')).toHaveAttribute('data-events', 'open,opened,close,closed,')
  await expect(page.locator('#image')).toBeVisible()
})

test('native close and focus listeners cannot leave stale state or dismiss a fresh session', async ({
  page,
}) => {
  await fixture(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('#trigger').focus()
  await page.evaluate(() => window.zoom.open())
  await page.evaluate(() => {
    document.querySelector('#trigger')!.addEventListener(
      'focus',
      () => {
        void window.zoom.open()
      },
      { once: true }
    )
  })
  await page.evaluate(() => window.zoom.close())
  await expect(page.locator('dialog')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Close image' })).toBeFocused()
  await page.evaluate(() => {
    document.querySelector('dialog')!.close()
  })
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('#image')).toBeVisible()
  expect(await page.evaluate(() => window.zoom.getZoomedImage())).toBeNull()
})

test('clone retains the renderer and owns independent sessions; detach cleans up', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(async () => {
    const clone = window.zoom.clone().attach('#image')
    await clone.open({ trigger: document.querySelector('#trigger')! })
    if (window.zoom.getZoomedImage()) {
      throw Error('Clone changed the source instance')
    }
    clone.detach()
  })
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('#image')).toBeVisible()
  await page.evaluate(async () => {
    await window.zoom.open()
    await window.zoom.close()
  })
})

test('touch controls and viewport dismissal clean up the modal', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch interaction requires a mobile context')
  await fixture(page)
  await page.locator('#trigger').tap()
  await expect(page.locator('body')).toHaveAttribute('data-events', 'open,opened,')
  await page.getByRole('button', { name: 'Close image' }).tap()
  await expect(page.locator('dialog')).toHaveCount(0)
  await page.locator('#trigger').tap()
  await expect(page.locator('body')).toHaveAttribute(
    'data-events',
    'open,opened,close,closed,open,opened,'
  )
  const viewport = page.viewportSize()!
  await page.setViewportSize({ width: viewport.height, height: viewport.width })
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('#image')).toBeVisible()
})

test('reentrant opening and autofocus listeners can cancel without leaking a host', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(async () => {
    window.zoom.on(
      'open',
      () => {
        void window.zoom.close()
      },
      { once: true }
    )
    await window.zoom.open()
  })
  await expect(page.locator('dialog')).toHaveCount(0)
  await page.evaluate(async () => {
    const cancel = (event: FocusEvent) => {
      if ((event.target as Element).closest('dialog')) {
        document.removeEventListener('focusin', cancel)
        void window.zoom.close()
      }
    }
    document.addEventListener('focusin', cancel)
    await window.zoom.open()
  })
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('.medium-zoom-overlay, .medium-zoom-image--opened')).toHaveCount(0)
  await expect(page.locator('#image')).toBeVisible()
  await page.evaluate(async () => {
    await window.zoom.open()
    await window.zoom.close()
  })
})

for (const kind of ['element', 'coordinates'] as const) {
  test(`${kind} containers retain geometry inside the modal`, async ({ page }) => {
    await fixture(page)
    await page.evaluate(async kind => {
      const element = document.querySelector<HTMLElement>('#container')!
      const { width, height, left, top } = element.getBoundingClientRect()
      window.configureDialog({
        container:
          kind === 'element' ? element : { width: width + left, height: height + top, left, top },
      })
      await window.zoom.open()
    }, kind)
    const image = await page.locator('dialog img').boundingBox()
    const box = await page.locator('#container').boundingBox()
    expect(image!.x + image!.width / 2).toBeCloseTo(box!.x + box!.width / 2, 0)
    expect(image!.y + image!.height / 2).toBeCloseTo(box!.y + box!.height / 2, 0)
    await page.evaluate(() => window.zoom.close())
  })
}
