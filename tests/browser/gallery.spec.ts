import { test, expect, type Page } from '@playwright/test'

import { preparePage } from './helpers'

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
    () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  )
  await page.addStyleTag({ url: '/experimental/dist/modern/style.css' })
  await page.addStyleTag({ url: '/experiments/gallery-controls.css' })
  await page.evaluate(async reverse => {
    const core = '/experimental/dist/core/index.mjs'
    const featuresPath = '/experimental/dist/features/index.mjs'
    const renderers = '/experimental/dist/renderers/index.mjs'
    const { createMediumZoom } = (await import(core)) as typeof import('../../src/core')
    const { accessibility, hdImage, template } = (await import(
      featuresPath
    )) as typeof import('../../src/features')
    const { dialog } = (await import(renderers)) as typeof import('../../src/renderers')
    const { createGallery } = (await import(
      String('/experimental/dist/gallery/index.mjs')
    )) as typeof import('../../src/gallery')
    const { mountExampleControls, mountCloseControl } = (await import(
      String('/experiments/gallery-controls.mjs')
    )) as typeof import('../experimental/gallery-controls.mjs')
    const { createZoomSession } = (await import(
      String('/experimental/dist/session/index.mjs')
    )) as typeof import('../../src/session')
    const features = [accessibility(), hdImage(), template()]
    const factory = createMediumZoom({
      renderer: dialog({
        content: view => {
          const close = mountCloseControl(view)
          const controls = mountExampleControls(view.element, createGallery(view.zoom))
          return () => {
            controls()
            close()
          }
        },
      }),
      features: reverse ? features.reverse() : features,
    })
    window.mediumZoom = (selector?: unknown, options?: import('../../src/types').ZoomOptions) => {
      const zoom = factory(selector as import('../../src/types').ZoomSelector, options)
      createZoomSession(zoom)
      return zoom
    }
    window.zoom = window.mediumZoom('#first, #second, #third', { template: '#caption' })
  }, order)
}

for (const reverse of [false, true]) {
  test(`composed gallery preserves its modal, controls and focus (${reverse ? 'reversed' : 'forward'} hooks)`, async ({
    page,
  }) => {
    await fixture(page, reverse)
    await page.locator('#first').focus()
    await page.keyboard.press('Enter')
    const modal = page.getByRole('dialog', { name: 'Mountain' })
    await expect(modal).toBeVisible()
    await expect(modal.getByRole('img')).toHaveAttribute('alt', 'Mountain')
    await expect(page.getByRole('button', { name: 'Close image' })).toBeFocused()
    await expect(modal.getByRole('status')).toHaveText('1 of 3')
    await expect(modal.getByRole('button', { name: 'Previous image' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    await page.evaluate(() => {
      document.querySelector('dialog')!.dataset.identity = 'retained'
    })
    await page.keyboard.press('ArrowRight')
    const nextModal = page.getByRole('dialog', { name: 'Forest' })
    await expect(nextModal).toHaveAttribute('data-identity', 'retained')
    await expect(nextModal.getByRole('status')).toHaveText('2 of 3')
    await expect(nextModal.getByRole('img')).toHaveAttribute('alt', 'Forest')
    await expect(nextModal.getByRole('textbox', { name: 'Caption' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Close image' })).toBeFocused()
    await nextModal.getByRole('button', { name: 'Next image' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status')).toHaveText('3 of 3')
    await expect(page.getByRole('button', { name: 'Next image' })).toBeFocused()
    await expect(page.getByRole('button', { name: 'Next image' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
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
    window.zoom.detach('#third')
    document.querySelector('#third')!.setAttribute('tabindex', '3')
    document.querySelector('#third')!.setAttribute('aria-label', 'Authored label')
    window.zoom.attach('#third')
  })
  await expect(page.locator('#third')).toHaveAttribute('role', 'button')
  await expect(page.locator('#third')).toHaveAttribute('tabindex', '3')
  await page.locator('#third').focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('dialog', { name: 'Ocean' })).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('img')).toHaveCount(1)
  await page.evaluate(() => window.zoom.detach())
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('#third')).not.toHaveAttribute('role')
  await expect(page.locator('#third')).toHaveAttribute('tabindex', '3')
  await expect(page.locator('#third')).toHaveAttribute('aria-label', 'Authored label')
  await expect(page.locator('#first')).not.toHaveAttribute('tabindex')
  await page.locator('#third').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('dialog')).toHaveCount(0)
  await page.evaluate(() => window.zoom.attach('#first'))
  await page.locator('#first').focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('native wrappers keep authored activation and prevented clicks do not open', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => {
    window.zoom.attach('#linked', '#wrapped')
    document.querySelector('#native')!.addEventListener('click', event => {
      if (!event.defaultPrevented) {
        void window.zoom.open({
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
    document.querySelector('#first')!.addEventListener('click', event => event.preventDefault())
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
  await page.evaluate(() => (document.querySelector('#before') as HTMLElement).focus())
  await expect(page.getByRole('textbox', { name: 'Caption' })).toBeFocused()
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab')
    expect(await page.locator('#before').evaluate(node => node === document.activeElement)).toBe(
      false
    )
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
    await route.fulfill({ path: 'stories/images/image-2.jpg', contentType: 'image/jpeg' })
  })
  await page.evaluate(() =>
    document.querySelector('#first')!.setAttribute('data-zoom-src', '/slow-image.jpg')
  )
  await page.locator('#first').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  release()
  await page.unrouteAll({ behavior: 'wait' })
  await expect(page.getByRole('dialog').getByRole('img')).toHaveCount(1)
  await expect(page.getByRole('dialog').getByRole('img')).toHaveAttribute('alt', 'Forest')
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('.medium-zoom-image--hidden')).toHaveCount(0)
})

test('clones retain accessibility and gallery capabilities with independent sessions', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => {
    const clone = window.zoom.clone().attach('#linked')
    window.zoom.detach()
    clone.attach('#first', '#second', '#third')
    window.zoom = clone
  })
  await page.locator('#second').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('status')).toHaveText('4 of 4')
  await page.evaluate(() => window.zoom.detach())
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('#second')).not.toHaveAttribute('role')
})

for (const cancel of ['close', 'detach', 'toggle'] as const) {
  test(`${cancel} cancels queued handoff between accessible instances`, async ({ page }) => {
    await fixture(page)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const result = await page.evaluate(async cancel => {
      await window.zoom.open()
      const second = window.mediumZoom('#second')
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
      return [window.zoom.getZoomedImage(), second.getZoomedImage()]
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
    await window.zoom.open()
    const second = window.mediumZoom('#linked')
    await second.open()
    if (window.zoom.getZoomedImage()) {
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

test('canceling a gallery open event disposes the retained host', async ({ page }) => {
  await fixture(page)
  await page.locator('#first').click()
  await page.evaluate(() =>
    window.zoom.on(
      'open',
      () => {
        void window.zoom.close()
      },
      { once: true }
    )
  )
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('.medium-zoom-image--hidden')).toHaveCount(0)
})

test('only the latest of three concurrent modal requests opens', async ({ page }) => {
  await fixture(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(async () => {
    await window.zoom.open()
    const second = window.mediumZoom('#linked')
    const third = window.mediumZoom('#wrapped')
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
    await window.zoom.open()
    const second = window.mediumZoom('#linked')
    await second.open({ target: document.querySelector('#third')! })
    if (!window.zoom.getZoomedImage() || second.getZoomedImage()) {
      throw new Error('Invalid target changed the active modal')
    }
    await window.zoom.close()
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
  await expect(page.locator('.medium-zoom-image--hidden, .medium-zoom-image--opened')).toHaveCount(
    0
  )
  await expect(page.locator('#first')).toBeFocused()
})

test('the combined modal has no automated accessibility violations', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  await fixture(page)
  await page.locator('#first').focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('dialog')).toBeVisible()
  const results = await new AxeBuilder({ page }).include('dialog').analyze()
  expect(results.violations).toEqual([])
})

test('gallery and modal-only features reject incompatible factories before DOM mutation', async ({
  page,
}) => {
  await fixture(page)
  expect(
    await page.evaluate(async () => {
      const core = '/experimental/dist/core/index.mjs'
      const features = '/experimental/dist/features/index.mjs'
      const galleries = '/experimental/dist/gallery/index.mjs'
      const { createMediumZoom } = (await import(core)) as typeof import('../../src/core')
      const { accessibility } = (await import(features)) as typeof import('../../src/features')
      const { createGallery } = (await import(galleries)) as typeof import('../../src/gallery')
      let rejected = 0
      try {
        createMediumZoom({ features: [accessibility()] })
      } catch {
        rejected++
      }
      const zoom = createMediumZoom()()
      try {
        createGallery(zoom)
      } catch {
        rejected++
      }
      return rejected
    })
  ).toBe(2)
  await expect(page.locator('dialog, .medium-zoom-overlay')).toHaveCount(0)
})

test('authored image labels survive trigger enhancement and cloning', async ({ page }) => {
  await fixture(page)
  await page.evaluate(() => {
    window.zoom.detach('#first')
    const image = document.querySelector('#first')!
    image.setAttribute('alt', '')
    image.setAttribute('aria-label', 'Sunset over the ocean')
    window.zoom.attach('#first')
  })
  await page.locator('#first').focus()
  await page.keyboard.press('Enter')
  const modal = page.getByRole('dialog', { name: 'Sunset over the ocean' })
  await expect(modal).toBeVisible()
  await expect(modal.getByRole('img', { name: 'Sunset over the ocean' })).toHaveCount(1)
})

test('pointer navigation switches fitted images without an animation', async ({ page }) => {
  await fixture(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => window.zoom.open())
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
  await expect(page.getByRole('dialog').getByRole('img', { name: 'Forest' })).toHaveCount(1)
})

test('keyboard navigation commits fitted bounds without a gallery animation', async ({ page }) => {
  await fixture(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => window.zoom.open())
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('dialog img')).toHaveCount(1)
  expect(
    await page.evaluate(
      () =>
        document
          .querySelector('dialog')!
          .getAnimations({ subtree: true })
          .filter(animation => animation.playState === 'running').length
    )
  ).toBe(0)
})

test('a framework-hidden source becomes accessible in the modal', async ({ page }) => {
  await fixture(page)
  await page.evaluate(() => document.querySelector('#second')!.setAttribute('aria-hidden', 'true'))
  await page.evaluate(() => window.zoom.open())
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('dialog').getByRole('img', { name: 'Forest' })).toHaveCount(1)
  await expect(page.locator('#second')).toHaveAttribute('aria-hidden', 'true')
})

test('disposing after pointer navigation hands ownership to a fresh session', async ({ page }) => {
  await fixture(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(async () => {
    window.zoom.detach()
    const core = '/experimental/dist/core/index.mjs'
    const renderers = '/experimental/dist/renderers/index.mjs'
    const sessions = '/experimental/dist/session/index.mjs'
    const { createMediumZoom } = (await import(core)) as typeof import('../../src/core')
    const { createGallery } = (await import(
      String('/experimental/dist/gallery/index.mjs')
    )) as typeof import('../../src/gallery')
    const { mountExampleControls, mountCloseControl } = (await import(
      String('/experiments/gallery-controls.mjs')
    )) as typeof import('../experimental/gallery-controls.mjs')
    const { dialog } = (await import(renderers)) as typeof import('../../src/renderers')
    const { createZoomSession } = (await import(sessions)) as typeof import('../../src/session')
    const factory = createMediumZoom({
      renderer: dialog({
        content: view => {
          const close = mountCloseControl(view)
          const controls = mountExampleControls(view.element, createGallery(view.zoom))
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
    page.locator('dialog, .medium-zoom-image--opened, .medium-zoom-image--hidden')
  ).toHaveCount(0)
})

test('ARIA interactive wrappers retain their own pointer and keyboard activation', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => {
    window.zoom.detach('#third')
    const image = document.querySelector('#third')!
    const wrapper = document.createElement('div')
    wrapper.id = 'checkbox'
    wrapper.setAttribute('role', 'checkbox')
    wrapper.setAttribute('aria-checked', 'false')
    image.before(wrapper)
    wrapper.append(image)
    wrapper.addEventListener('click', () => wrapper.setAttribute('aria-checked', 'true'))
    window.zoom.attach('#third')
  })
  await expect(page.locator('#third')).not.toHaveAttribute('tabindex')
  await page.locator('#third').click()
  await expect(page.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
  await expect(page.locator('dialog')).toHaveCount(0)
})
