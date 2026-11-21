import { expect, type Page, test } from '@playwright/test'

import { addModernStyles, preparePage } from './helpers'

declare global {
  interface Window {
    /** A composed gallery zoom whose open requests all go through a session. */
    createGalleryZoom(
      selector?: import('../../src/zoom').ZoomSelector,
      options?: import('../../src/preset/medium-zoom').ZoomOptions
    ): import('../../src/zoom').ModalZoom
  }
}

async function fixture(page: Page, order = false) {
  await preparePage(page, {
    body: `
    <button id="before">Before</button>
    <img id="first" src="/images/image-1.jpg" width="160" alt="Mountain">
    <img id="second" src="/images/image-2.jpg" width="160" alt="Forest">
    <img id="third" src="/images/image-1.jpg" width="160" alt="Ocean">
    <a href="#destination" id="link"><img id="linked" src="/images/image-1.jpg" width="80" alt="Linked"></a>
    <button id="native"><img id="wrapped" src="/images/image-1.jpg" width="80" alt="Wrapped"></button>
    <template id="caption"><div style="position:fixed;top:16px;left:16px"><input aria-label="Caption" value="Author text"><button id="details">Details</button></div></template>
  `,
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(
    () =>
      new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  )
  await addModernStyles(page)
  await page.addStyleTag({ url: '/experiments/gallery-controls.css' })
  await page.evaluate(async sessionFirst => {
    const { createZoom } = await window.loadEntry('core')
    const { loadHdImage } = await window.loadEntry('loaders')
    const { bindZoomTriggers } = await window.loadEntry('triggers')
    const { templateContent } = await window.loadEntry('content')
    const { createGallery } = await window.loadEntry('gallery')
    const { dialog } = await window.loadEntry('renderers')
    const { mountExampleControls, mountCloseControl } = (await import(
      String('/experiments/gallery-controls.mjs')
    )) as typeof import('../experimental/gallery-controls.mjs')
    const { createZoomSession } = await window.loadEntry('session')
    window.createGalleryZoom = (selector, { template, ...options } = {}) => {
      const zoom = createZoom(selector, {
        ...options,
        loader: loadHdImage,
        renderer: dialog({
          content: view => {
            const close = mountCloseControl(view)
            const controls = mountExampleControls(
              view.element,
              createGallery(view.zoom, createZoomSession(view.zoom))
            )
            const content = template
              ? templateContent(template)(view)
              : undefined
            return () => {
              content?.()
              controls()
              close()
            }
          },
        }),
      })
      // The application composes coordination: every request goes through the session.
      const session = createZoomSession(zoom)
      if (sessionFirst) {
        bindZoomTriggers(zoom, session)
      } else {
        bindZoomTriggers(zoom, {
          open: options => createZoomSession(zoom).open(options),
        })
      }
      return Object.assign(Object.create(zoom), {
        open: session.open,
        close: session.close,
        toggle: session.toggle,
      })
    }
    window.modalZoom = window.createGalleryZoom('#first, #second, #third', {
      template: '#caption',
    })
  }, order)
}

for (const reverse of [false, true]) {
  test(`composed gallery preserves its modal, controls and focus (${reverse ? 'session first' : 'bindings first'})`, async ({
    page,
  }) => {
    await fixture(page, reverse)
    await page.locator('#first').focus()
    await page.keyboard.press('Enter')
    const modal = page.getByRole('dialog', { name: 'Mountain' })
    await expect(modal).toBeVisible()
    await expect(modal.getByRole('img')).toHaveAttribute('alt', 'Mountain')
    await expect(
      page.getByRole('button', { name: 'Close image' })
    ).toBeFocused()
    await expect(modal.getByRole('status')).toHaveText('1 of 3')
    await expect(
      modal.getByRole('button', { name: 'Previous image' })
    ).toHaveAttribute('aria-disabled', 'true')
    await page.evaluate(() => {
      document.querySelector('dialog')!.dataset.identity = 'retained'
    })
    await page.keyboard.press('ArrowRight')
    const nextModal = page.getByRole('dialog', { name: 'Forest' })
    await expect(nextModal).toHaveAttribute('data-identity', 'retained')
    await expect(nextModal.getByRole('status')).toHaveText('2 of 3')
    await expect(nextModal.getByRole('img')).toHaveAttribute('alt', 'Forest')
    await expect(
      nextModal.getByRole('textbox', { name: 'Caption' })
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Close image' })
    ).toBeFocused()
    await nextModal.getByRole('button', { name: 'Next image' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status')).toHaveText('3 of 3')
    await expect(page.getByRole('button', { name: 'Next image' })).toBeFocused()
    await expect(
      page.getByRole('button', { name: 'Next image' })
    ).toHaveAttribute('aria-disabled', 'true')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('status')).toHaveText('3 of 3')
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('status')).toHaveText('2 of 3')
    await page.keyboard.press('Escape')
    await expect(page.locator('dialog')).toHaveCount(0)
    await expect(page.locator('#first')).toBeFocused()
    await expect(page.locator('.medium-zoom-image--hidden')).toHaveCount(0)
  })
}

test('bare keyboard triggers restore attributes and listeners after detach and reattach', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => {
    window.modalZoom.detach('#third')
    document.querySelector('#third')!.setAttribute('tabindex', '3')
    document
      .querySelector('#third')!
      .setAttribute('aria-label', 'Authored label')
    window.modalZoom.attach('#third')
  })
  await expect(page.locator('#third')).toHaveAttribute('role', 'button')
  await expect(page.locator('#third')).toHaveAttribute('tabindex', '3')
  await page.locator('#third').focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('dialog', { name: 'Ocean' })).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('img')).toHaveCount(1)
  await page.evaluate(() => window.modalZoom.detach())
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('#third')).not.toHaveAttribute('role')
  await expect(page.locator('#third')).toHaveAttribute('tabindex', '3')
  await expect(page.locator('#third')).toHaveAttribute(
    'aria-label',
    'Authored label'
  )
  await expect(page.locator('#first')).not.toHaveAttribute('tabindex')
  await page.locator('#third').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('dialog')).toHaveCount(0)
  await page.evaluate(() => window.modalZoom.attach('#first'))
  await page.locator('#first').focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('native wrappers keep authored activation and prevented clicks do not open', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => {
    window.modalZoom.attach('#linked', '#wrapped')
    document.querySelector('#native')!.addEventListener('click', event => {
      if (!event.defaultPrevented) {
        void window.modalZoom.open({
          target: document.querySelector('#wrapped')!,
          trigger: event.currentTarget as HTMLElement,
        })
      }
    })
  })
  await expect(page.locator('#linked')).not.toHaveAttribute('role')
  await expect(page.locator('#wrapped')).not.toHaveAttribute('tabindex')
  await page.locator('#linked').click()
  await expect(page).toHaveURL(/#destination$/)
  await expect(page.locator('dialog')).toHaveCount(0)
  await page.locator('#native').focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('dialog', { name: 'Wrapped' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#native')).toBeFocused()
  await page.evaluate(() =>
    document
      .querySelector('#first')!
      .addEventListener('click', event => event.preventDefault())
  )
  await page.locator('#first').click()
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('gallery keys leave editable template controls alone and background stays inert', async ({
  page,
}) => {
  await fixture(page)
  await page.locator('#first').click()
  await page.getByRole('textbox', { name: 'Caption' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('status')).toHaveText('1 of 3')
  await page.evaluate(() =>
    (document.querySelector('#before') as HTMLElement).focus()
  )
  await expect(page.getByRole('textbox', { name: 'Caption' })).toBeFocused()
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab')
    expect(
      await page
        .locator('#before')
        .evaluate(node => node === document.activeElement)
    ).toBe(false)
  }
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('navigation cancels stale HD loading while retaining one modal and one accessible image', async ({
  page,
}) => {
  await fixture(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  await page.route('**/slow-image.jpg', async route => {
    await gate
    await route.fulfill({
      path: 'stories/images/image-2.jpg',
      contentType: 'image/jpeg',
    })
  })
  await page.evaluate(() =>
    document
      .querySelector('#first')!
      .setAttribute('data-zoom-src', '/slow-image.jpg')
  )
  await page.locator('#first').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  release()
  await page.unrouteAll({ behavior: 'wait' })
  await expect(page.getByRole('dialog').getByRole('img')).toHaveCount(1)
  await expect(page.getByRole('dialog').getByRole('img')).toHaveAttribute(
    'alt',
    'Forest'
  )
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('.medium-zoom-image--hidden')).toHaveCount(0)
})

test('clones retain rendering strategies with explicit bindings and independent sessions', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(async () => {
    const { bindZoomTriggers } = await window.loadEntry('triggers')
    const { createZoomSession } = await window.loadEntry('session')
    const clone = window.modalZoom.clone().attach('#linked')
    window.modalZoom.detach()
    clone.attach('#first', '#second', '#third')
    bindZoomTriggers(clone, createZoomSession(clone))
    window.modalZoom = clone
  })
  await page.locator('#second').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('status')).toHaveText('4 of 4')
  await page.evaluate(() => window.modalZoom.detach())
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('#second')).not.toHaveAttribute('role')
})

for (const cancel of ['close', 'detach', 'toggle'] as const) {
  test(`${cancel} cancels queued handoff between accessible instances`, async ({
    page,
  }) => {
    await fixture(page)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const result = await page.evaluate(async cancel => {
      await window.modalZoom.open()
      const second = window.createGalleryZoom('#second')
      const opening = second.open()
      if (cancel === 'close') {
        void second.close()
      }
      if (cancel === 'detach') {
        second.detach()
      }
      if (cancel === 'toggle') {
        void second.toggle()
      }
      await opening
      return [window.modalZoom.getZoomedImage(), second.getZoomedImage()]
    }, cancel)
    expect(result).toEqual([null, null])
    await expect(page.locator('dialog')).toHaveCount(0)
    await page.locator('#first').focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
  })
}

test('independent instances hand off to one modal and coalesce closing promises', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(async () => {
    await window.modalZoom.open()
    const second = window.createGalleryZoom('#linked')
    await second.open()
    if (window.modalZoom.getZoomedImage()) {
      throw new Error('Previous modal remained active')
    }
    if (document.querySelectorAll('dialog').length !== 1) {
      throw new Error('Multiple modals')
    }
    await Promise.all([second.close(), second.close()])
    if (document.querySelector('dialog')) {
      throw new Error('Closing resolved before disposal')
    }
  })
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('canceling a gallery open event disposes the retained host', async ({
  page,
}) => {
  await fixture(page)
  await page.locator('#first').click()
  await page.evaluate(() =>
    window.modalZoom.on(
      'open',
      () => {
        void window.modalZoom.close()
      },
      { once: true }
    )
  )
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('.medium-zoom-image--hidden')).toHaveCount(0)
})

test('only the latest of three concurrent modal requests opens', async ({
  page,
}) => {
  await fixture(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(async () => {
    await window.modalZoom.open()
    const second = window.createGalleryZoom('#linked')
    const third = window.createGalleryZoom('#wrapped')
    await Promise.all([second.open(), third.open()])
    if (second.getZoomedImage()) {
      throw new Error('Superseded request opened a modal')
    }
    if (!third.getZoomedImage()) {
      throw new Error('Latest request was lost')
    }
    if (document.querySelectorAll('dialog').length !== 1) {
      throw new Error('Multiple modals')
    }
    await third.close()
  })
})

test('an invalid target leaves the active instance alone', async ({ page }) => {
  await fixture(page)
  await page.evaluate(async () => {
    await window.modalZoom.open()
    const second = window.createGalleryZoom('#linked')
    await second.open({ target: document.querySelector('#third')! })
    if (!window.modalZoom.getZoomedImage() || second.getZoomedImage()) {
      throw new Error('Invalid target changed the active modal')
    }
    await window.modalZoom.close()
  })
})

test('rapid gallery navigation interrupts animation and cleanup still resolves', async ({
  page,
}) => {
  await fixture(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.locator('#first').focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('dialog', { name: 'Ocean' })).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('3 of 3')
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(
    page.locator('.medium-zoom-image--hidden, .medium-zoom-image--opened')
  ).toHaveCount(0)
  await expect(page.locator('#first')).toBeFocused()
})

test('the combined modal has no automated accessibility violations', async ({
  page,
}) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  await fixture(page)
  await page.locator('#first').focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('dialog')).toBeVisible()
  const results = await new AxeBuilder({ page }).include('dialog').analyze()
  expect(results.violations).toEqual([])
})

test('authored image labels survive trigger enhancement and cloning', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => {
    window.modalZoom.detach('#first')
    const image = document.querySelector('#first')!
    image.setAttribute('alt', '')
    image.setAttribute('aria-label', 'Sunset over the ocean')
    window.modalZoom.attach('#first')
  })
  await page.locator('#first').focus()
  await page.keyboard.press('Enter')
  const modal = page.getByRole('dialog', { name: 'Sunset over the ocean' })
  await expect(modal).toBeVisible()
  await expect(
    modal.getByRole('img', { name: 'Sunset over the ocean' })
  ).toHaveCount(1)
})

test('pointer navigation switches fitted images without an animation', async ({
  page,
}) => {
  await fixture(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => window.modalZoom.open())
  await page.getByRole('button', { name: 'Next image' }).click()
  await expect(page.locator('dialog img')).toHaveCount(1)
  const state = await page.evaluate(() => {
    const modal = document.querySelector('dialog')!
    const image = modal.querySelector('img')!
    const bounds = image.getBoundingClientRect()
    return {
      animations: modal
        .getAnimations({ subtree: true })
        .filter(animation => animation.playState === 'running').length,
      center: [bounds.x + bounds.width / 2, bounds.y + bounds.height / 2],
      viewport: [innerWidth / 2, innerHeight / 2],
    }
  })
  expect(state.animations).toBe(0)
  expect(state.center[0]).toBeCloseTo(state.viewport[0]!, 0)
  expect(state.center[1]).toBeCloseTo(state.viewport[1]!, 0)
  await expect(
    page.getByRole('dialog').getByRole('img', { name: 'Forest' })
  ).toHaveCount(1)
})

test('keyboard navigation commits fitted bounds without a gallery animation', async ({
  page,
}) => {
  await fixture(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => window.modalZoom.open())
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('dialog img')).toHaveCount(1)
  expect(
    await page.evaluate(
      () =>
        // The backdrop fade from opening can still be finishing; only frames must not animate.
        Array.from(document.querySelectorAll('dialog img')).flatMap(frame =>
          frame
            .getAnimations()
            .filter(animation => animation.playState === 'running')
        ).length
    )
  ).toBe(0)
})

test('a framework-hidden source becomes accessible in the modal', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() =>
    document.querySelector('#second')!.setAttribute('aria-hidden', 'true')
  )
  await page.evaluate(() => window.modalZoom.open())
  await page.keyboard.press('ArrowRight')
  await expect(
    page.getByRole('dialog').getByRole('img', { name: 'Forest' })
  ).toHaveCount(1)
  await expect(page.locator('#second')).toHaveAttribute('aria-hidden', 'true')
})

test('disposing after pointer navigation hands ownership to a fresh session', async ({
  page,
}) => {
  await fixture(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(async () => {
    window.modalZoom.detach()
    const { createZoom } = await window.loadEntry('core')
    const { createGallery } = await window.loadEntry('gallery')
    const { mountExampleControls, mountCloseControl } = (await import(
      String('/experiments/gallery-controls.mjs')
    )) as typeof import('../experimental/gallery-controls.mjs')
    const { dialog } = await window.loadEntry('renderers')
    const { createZoomSession } = await window.loadEntry('session')
    const factory = (selector: import('../../src/zoom/engine').ZoomSelector) =>
      createZoom(selector, {
        renderer: dialog({
          content: view => {
            const close = mountCloseControl(view)
            const controls = mountExampleControls(
              view.element,
              createGallery(view.zoom)
            )
            return () => {
              controls()
              close()
            }
          },
        }),
      })
    const first = createZoomSession(factory('#first, #second'))
    await first.open()
    document
      .querySelector('.medium-zoom-gallery button:last-child')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    const disposing = first.dispose()
    const second = createZoomSession(factory('#third'))
    await second.open()
    await disposing
    if (document.querySelectorAll('dialog').length !== 1) {
      throw new Error('Old host survived disposal')
    }
    if (document.querySelector('dialog')!.hasAttribute('aria-busy')) {
      throw new Error('Stale busy state')
    }
    await second.dispose()
  })
  await expect(
    page.locator(
      'dialog, .medium-zoom-image--opened, .medium-zoom-image--hidden'
    )
  ).toHaveCount(0)
})

test('ARIA interactive wrappers retain their own pointer and keyboard activation', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => {
    window.modalZoom.detach('#third')
    const image = document.querySelector('#third')!
    const wrapper = document.createElement('div')
    wrapper.id = 'checkbox'
    wrapper.setAttribute('role', 'checkbox')
    wrapper.setAttribute('aria-checked', 'false')
    image.before(wrapper)
    wrapper.append(image)
    wrapper.addEventListener('click', () =>
      wrapper.setAttribute('aria-checked', 'true')
    )
    window.modalZoom.attach('#third')
  })
  await expect(page.locator('#third')).not.toHaveAttribute('tabindex')
  await page.locator('#third').click()
  await expect(page.getByRole('checkbox')).toHaveAttribute(
    'aria-checked',
    'true'
  )
  await expect(page.locator('dialog')).toHaveCount(0)
})
