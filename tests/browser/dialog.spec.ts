import { expect, type Page, test } from '@playwright/test'

import { addModernStyles, preparePage } from './helpers'

declare global {
  interface Window {
    configureDialog(
      options: import('../../src/preset/medium-zoom').ZoomOptions
    ): void
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
    () =>
      new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  )
  await addModernStyles(page)
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { loadHdImage } = await window.loadEntry('loaders')
    const { containerBounds } = await window.loadEntry('viewport')
    const { templateContent } = await window.loadEntry('content')
    const { dialog } = await window.loadEntry('renderers')
    const { mountCloseControl } = await import(
      String('/experiments/close-control.mjs')
    )
    let selected: import('../../src/preset/medium-zoom').ZoomOptions = {}
    window.modalZoom = createZoom('#image', {
      renderer: dialog({
        content: view => {
          const close = mountCloseControl(view)
          const content = selected.template
            ? templateContent(selected.template)(view)
            : undefined
          return () => {
            content?.()
            close()
          }
        },
      }),
      loader: loadHdImage,
      viewport: (bounds, options) =>
        selected.container
          ? containerBounds(selected.container)(bounds, options)
          : bounds,
    })
    window.configureDialog = ({ container, template, ...options }) => {
      if (container !== undefined) {
        selected = { ...selected, container }
      }
      if (template !== undefined) {
        selected = { ...selected, template }
      }
      window.modalZoom.update(options)
    }
    document.querySelector('#trigger')!.addEventListener('click', event => {
      void window.modalZoom.open({
        target: document.querySelector('#image')!,
        trigger: event.currentTarget as HTMLElement,
      })
    })
    for (const type of ['open', 'opened', 'close', 'closed']) {
      window.modalZoom.on(type, () => {
        document.body.dataset.events =
          (document.body.dataset.events || '') + type + ','
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
    await expect(page.locator('body')).toHaveAttribute(
      'data-events',
      'open,opened,'
    )
    await expect(modal.locator('.medium-zoom-image--opened')).toHaveCount(2)
    await expect(modal.getByRole('img')).toHaveCount(1)
    await expect(modal.locator('#template-control')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Close image' })
    ).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.locator('#template-control')).toBeFocused()
    await page.keyboard.press('Tab')
    // Some engines cycle via the document viewport before returning to the first control.
    expect(
      await page.evaluate(
        () =>
          document.activeElement === document.body ||
          !!document.activeElement?.closest('dialog')
      )
    ).toBe(true)
    await page.keyboard.press('Tab')
    expect(
      await page
        .locator('#outside')
        .evaluate(element => element === document.activeElement)
    ).toBe(false)
    await page.keyboard.press('Escape')
    if (reducedMotion === 'no-preference') {
      await expect(modal).toHaveJSProperty('open', true)
    }
    await expect(modal).toHaveCount(0)
    await expect(page.locator('#trigger')).toBeFocused()
    await expect(page.locator('body')).toHaveAttribute(
      'data-events',
      'open,opened,close,closed,'
    )
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
    const original = document
      .querySelector('#image')!
      .getBoundingClientRect()
      .toJSON()
    void window.modalZoom.open({
      trigger: document.querySelector('#trigger')!,
    })
    const initial = document
      .querySelector('dialog img')!
      .getBoundingClientRect()
      .toJSON()
    return { original, initial }
  })
  expect(initial!.x).toBeCloseTo(original!.x, 0)
  expect(initial!.y).toBeCloseTo(original!.y, 0)
  await expect(page.locator('body')).toHaveAttribute(
    'data-events',
    'open,opened,'
  )
  const box = await page.locator('dialog img').boundingBox()
  const container = await page.locator('#container').boundingBox()
  expect(box!.x + box!.width / 2).toBeCloseTo(
    container!.x + container!.width / 2,
    0
  )
  expect(box!.y + box!.height / 2).toBeCloseTo(
    container!.y + container!.height / 2,
    0
  )
  expect(
    await page.evaluate(() =>
      document.querySelector('dialog')!.matches(':modal')
    )
  ).toBe(true)
  await page.locator('dialog img').click()
  await expect(page.locator('dialog')).toHaveCount(0)
  await page.evaluate(() => window.modalZoom.open())
  await page.locator('.medium-zoom-overlay').click({ position: { x: 2, y: 2 } })
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('Escape cancels pending HD loading and cleanup allows reopening', async ({
  page,
}) => {
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
  await expect(page.locator('body')).toHaveAttribute(
    'data-events',
    'open,close,closed,'
  )
  await page.evaluate(() => window.modalZoom.open())
  await expect(page.locator('dialog img')).toHaveCount(2)
  await page.evaluate(() => window.modalZoom.close())
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('opening can be interrupted and closed listeners can reopen a fresh modal', async ({
  page,
}) => {
  await fixture(page)
  await page.addStyleTag({
    content: '.medium-zoom-image { transition-duration: 1s !important }',
  })
  await page.evaluate(() => {
    void window.modalZoom.open()
    setTimeout(() => {
      void window.modalZoom.close()
    }, 80)
  })
  await expect(page.locator('dialog')).toHaveCount(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(async () => {
    await window.modalZoom.open()
    window.modalZoom.on(
      'closed',
      () => {
        void window.modalZoom.open()
      },
      { once: true }
    )
    await window.modalZoom.close()
  })
  await expect(page.locator('dialog')).toHaveCount(1)
  await expect(page.locator('dialog')).toHaveJSProperty('open', true)
  await page.evaluate(() => window.modalZoom.close())
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('unsupported browsers reject without leaving an active session', async ({
  page,
}) => {
  await fixture(page)
  expect(
    await page.evaluate(async () => {
      // oxlint-disable-next-line typescript/unbound-method -- Restore the native method after the capability test.
      const show = HTMLDialogElement.prototype.showModal
      HTMLDialogElement.prototype.showModal =
        undefined as unknown as typeof show
      try {
        await window.modalZoom.open()
        return false
      } catch {
        return window.modalZoom.getZoomedImage() === null
      } finally {
        HTMLDialogElement.prototype.showModal = show
      }
    })
  ).toBe(true)
  await expect(page.locator('dialog, .medium-zoom-overlay')).toHaveCount(0)
  await page.evaluate(async () => {
    await window.modalZoom.open()
    await window.modalZoom.close()
  })
})

test('template dialog forms use the animated close lifecycle', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => {
    document.querySelector('template')!.innerHTML =
      '<form method="dialog" style="position:fixed;top:16px;left:16px"><button>Done</button></form>'
    window.configureDialog({ template: '#template' })
  })
  await page.locator('#trigger').click()
  await expect(page.locator('body')).toHaveAttribute(
    'data-events',
    'open,opened,'
  )
  await page.evaluate(() =>
    document
      .querySelector('dialog form')!
      .addEventListener('submit', event => event.preventDefault(), {
        once: true,
      })
  )
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('dialog')).toHaveJSProperty('open', true)
  await expect(page.locator('body')).toHaveAttribute(
    'data-events',
    'open,opened,'
  )
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('body')).toHaveAttribute(
    'data-events',
    'open,opened,close,closed,'
  )
  await expect(page.locator('#image')).toBeVisible()
})

test('native close and focus listeners cannot leave stale state or dismiss a fresh session', async ({
  page,
}) => {
  await fixture(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('#trigger').focus()
  await page.evaluate(() => window.modalZoom.open())
  await page.evaluate(() => {
    document.querySelector('#trigger')!.addEventListener(
      'focus',
      () => {
        void window.modalZoom.open()
      },
      { once: true }
    )
  })
  await page.evaluate(() => window.modalZoom.close())
  await expect(page.locator('dialog')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Close image' })).toBeFocused()
  await page.evaluate(() => {
    document.querySelector('dialog')!.close()
  })
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('#image')).toBeVisible()
  expect(
    await page.evaluate(() => window.modalZoom.getZoomedImage())
  ).toBeNull()
})

test('clone retains the renderer and owns independent sessions; detach cleans up', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(async () => {
    const clone = window.modalZoom.clone().attach('#image')
    await clone.open({ trigger: document.querySelector('#trigger')! })
    if (window.modalZoom.getZoomedImage()) {
      throw Error('Clone changed the source instance')
    }
    clone.detach()
  })
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('#image')).toBeVisible()
  await page.evaluate(async () => {
    await window.modalZoom.open()
    await window.modalZoom.close()
  })
})

test('touch controls clean up the modal, and rotating refits the open image', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch interaction requires a mobile context')
  await fixture(page)
  await page.locator('#trigger').tap()
  await expect(page.locator('body')).toHaveAttribute(
    'data-events',
    'open,opened,'
  )
  await page.getByRole('button', { name: 'Close image' }).tap()
  await expect(page.locator('dialog')).toHaveCount(0)
  await page.locator('#trigger').tap()
  await expect(page.locator('body')).toHaveAttribute(
    'data-events',
    'open,opened,close,closed,open,opened,'
  )
  const viewport = page.viewportSize()!
  await page.setViewportSize({ width: viewport.height, height: viewport.width })
  // Rotating keeps the zoom open, centred inside the new window.
  await expect(page.locator('dialog')).toHaveCount(1)
  await expect
    .poll(() =>
      page.locator('dialog img').evaluate(frame => {
        const box = frame.getBoundingClientRect()
        return (
          box.right <= innerWidth + 1 &&
          box.bottom <= innerHeight + 1 &&
          Math.abs(box.left + box.width / 2 - innerWidth / 2) <= 1 &&
          Math.abs(box.top + box.height / 2 - innerHeight / 2) <= 1
        )
      })
    )
    .toBe(true)
  await page.getByRole('button', { name: 'Close image' }).tap()
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('#image')).toBeVisible()
})

test('reentrant opening and autofocus listeners can cancel without leaking a host', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(async () => {
    window.modalZoom.on(
      'open',
      () => {
        void window.modalZoom.close()
      },
      { once: true }
    )
    await window.modalZoom.open()
  })
  await expect(page.locator('dialog')).toHaveCount(0)
  await page.evaluate(async () => {
    const cancel = (event: FocusEvent) => {
      if ((event.target as Element).closest('dialog')) {
        document.removeEventListener('focusin', cancel)
        void window.modalZoom.close()
      }
    }
    document.addEventListener('focusin', cancel)
    await window.modalZoom.open()
  })
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(
    page.locator('.medium-zoom-overlay, .medium-zoom-image--opened')
  ).toHaveCount(0)
  await expect(page.locator('#image')).toBeVisible()
  await page.evaluate(async () => {
    await window.modalZoom.open()
    await window.modalZoom.close()
  })
})

for (const kind of ['element', 'coordinates'] as const) {
  test(`${kind} containers retain geometry inside the modal`, async ({
    page,
  }) => {
    await fixture(page)
    await page.evaluate(async kind => {
      const element = document.querySelector<HTMLElement>('#container')!
      const { width, height, left, top } = element.getBoundingClientRect()
      window.configureDialog({
        container: {
          element,
          coordinates: { width: width + left, height: height + top, left, top },
        }[kind],
      })
      await window.modalZoom.open()
    }, kind)
    const image = await page.locator('dialog img').boundingBox()
    const box = await page.locator('#container').boundingBox()
    expect(image!.x + image!.width / 2).toBeCloseTo(box!.x + box!.width / 2, 0)
    expect(image!.y + image!.height / 2).toBeCloseTo(
      box!.y + box!.height / 2,
      0
    )
    await page.evaluate(() => window.modalZoom.close())
  })
}
