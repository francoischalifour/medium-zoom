import { expect, type Page, test } from '@playwright/test'

import { addModernStyles, preparePage } from './helpers'

declare global {
  interface Window {
    createGalleryZoom(
      selector?: import('../../src/zoom').ZoomSelector,
      options?: import('../../src/preset/medium-zoom').ZoomOptions
    ): import('../../src/zoom').ModalZoom
  }
}

async function fixture(page: Page, sharedSession = false) {
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
  await page.evaluate(async sharedSession => {
    const { createZoom } = await window.loadEntry('core')
    const { loadHdImage } = await window.loadEntry('loaders')
    const { bindZoomTriggers } = await window.loadEntry('triggers')
    const { templateContent } = await window.loadEntry('content')
    const { galleryControls } = await window.loadEntry('gallery')
    const { dialog } = await window.loadEntry('renderers')
    const { createZoomSession } = await window.loadEntry('session')
    window.createGalleryZoom = (selector, { template, ...options } = {}) => {
      const zoom = createZoom(selector, {
        ...options,
        loader: loadHdImage,
        renderer: dialog({
          content: view => {
            const controls = galleryControls()(view)
            const content = template
              ? templateContent(template)(view)
              : undefined
            return () => {
              content?.()
              controls?.()
            }
          },
        }),
      })
      // Triggers open through the shared session, or through a new one per open.
      const session = createZoomSession(zoom)
      if (sharedSession) {
        bindZoomTriggers(zoom, { commander: session })
      } else {
        bindZoomTriggers(zoom, {
          commander: {
            open: options => createZoomSession(zoom).open(options),
          },
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
  }, sharedSession)
}

for (const sharedSession of [false, true]) {
  test(`composed gallery preserves its modal, controls and focus (${sharedSession ? 'shared session' : 'session per open'})`, async ({
    page,
  }) => {
    await fixture(page, sharedSession)
    await page.locator('#first').focus()
    await page.keyboard.press('Enter')
    const modal = page.getByRole('dialog', { name: 'Mountain' })
    await expect(modal).toBeVisible()
    await expect(modal.getByRole('img')).toHaveAttribute('alt', 'Mountain')
    await expect(page.locator('dialog')).toBeFocused()
    await expect(modal.getByRole('status')).toContainText('Image 1 of 3')
    await expect(
      modal.getByRole('button', { name: 'Previous image' })
    ).toHaveAttribute('aria-disabled', 'true')
    await page.evaluate(() => {
      document.querySelector('dialog')!.dataset.identity = 'retained'
    })
    await page.keyboard.press('ArrowRight')
    const nextModal = page.getByRole('dialog', { name: 'Forest' })
    await expect(nextModal).toHaveAttribute('data-identity', 'retained')
    await expect(nextModal.getByRole('status')).toContainText('Image 2 of 3')
    await expect(nextModal.getByRole('img')).toHaveAttribute('alt', 'Forest')
    await expect(
      nextModal.getByRole('textbox', { name: 'Caption' })
    ).toBeVisible()
    await expect(page.locator('dialog')).toBeFocused()
    await nextModal.getByRole('button', { name: 'Next image' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('status')).toContainText('Image 3 of 3')
    await expect(page.getByRole('button', { name: 'Next image' })).toBeFocused()
    await expect(
      page.getByRole('button', { name: 'Next image' })
    ).toHaveAttribute('aria-disabled', 'true')
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('status')).toContainText('Image 3 of 3')
    await page.keyboard.press('ArrowLeft')
    await expect(page.getByRole('status')).toContainText('Image 2 of 3')
    await page.keyboard.press('Escape')
    await expect(page.locator('dialog')).toHaveCount(0)
    await expect(page.locator('#second')).toBeFocused()
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

test('gallery keys leave editable template controls alone and the page behind stays inert', async ({
  page,
}) => {
  await fixture(page)
  await page.locator('#first').click()
  await page.getByRole('textbox', { name: 'Caption' }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('status')).toContainText('Image 1 of 3')
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
    bindZoomTriggers(clone, { commander: createZoomSession(clone) })
    window.modalZoom = clone
  })
  await page.locator('#second').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('status')).toContainText('Image 4 of 4')
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
  await expect(page.getByRole('status')).toContainText('Image 3 of 3')
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(
    page.locator('.medium-zoom-image--hidden, .medium-zoom-image--opened')
  ).toHaveCount(0)
  await expect(page.locator('#third')).toBeFocused()
})

test('the combined modal has no automated accessibility violations', async ({
  page,
}) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright')
  // A frozen clock keeps the controls from fading while axe measures their contrast.
  await page.clock.install()
  await fixture(page)
  await page.locator('#first').focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('dialog')).toBeVisible()
  // Measure contrast once the controls have faded in.
  await expect(page.locator('.medium-zoom-navigation')).toHaveCSS(
    'opacity',
    '1'
  )
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
      animations: image
        .getAnimations()
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
    const { galleryControls } = await window.loadEntry('gallery')
    const { dialog } = await window.loadEntry('renderers')
    const { createZoomSession } = await window.loadEntry('session')
    const factory = (selector: import('../../src/zoom/engine').ZoomSelector) =>
      createZoom(selector, {
        renderer: dialog({ content: galleryControls() }),
      })
    const first = createZoomSession(factory('#first, #second'))
    await first.open()
    document
      .querySelector('.medium-zoom-control--next')!
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

async function stockFixture(
  page: Page,
  body: string,
  {
    positionLabel,
    ...labels
  }: Omit<
    import('../../src/gallery').GalleryControlsOptions,
    'positionLabel'
  > & { positionLabel?: string } = {}
) {
  await preparePage(page, { body })
  await addModernStyles(page)
  await page.evaluate(
    async ({ labels, positionLabel }) => {
      const { createZoom } = await window.loadEntry('core')
      const { galleryControls } = await window.loadEntry('gallery')
      const { dialog } = await window.loadEntry('renderers')
      const { bindZoomTriggers } = await window.loadEntry('triggers')
      const controls = galleryControls({
        ...labels,
        ...(positionLabel && {
          positionLabel: (position, total) =>
            positionLabel
              .replace('{position}', String(position))
              .replace('{total}', String(total)),
        }),
      })
      window.modalZoom = createZoom('img', {
        renderer: dialog({ content: controls }),
      })
      bindZoomTriggers(window.modalZoom)
    },
    { labels, positionLabel }
  )
}

const threeImages =
  '<img src="/images/image-1.jpg" width="160" alt="Mountain"><img src="/images/image-2.jpg" width="160" alt="Forest"><img src="/images/image-1.jpg" width="160" alt="Ocean">'

test('the zoom opens at once and sharpens in place when the high-resolution image arrives', async ({
  page,
}) => {
  await preparePage(page, {
    body: '<img src="/images/image-1.jpg" data-zoom-src="/slow-zoom.jpg" width="160" alt="Sunset">',
  })
  await addModernStyles(page)
  let release!: () => void
  const gate = new Promise<void>(resolve => (release = resolve))
  await page.route('**/slow-zoom.jpg', async route => {
    await gate
    await route.fulfill({ path: 'stories/images/image-1.jpg' })
  })
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { loadHdImage } = await window.loadEntry('loaders')
    const { dialog } = await window.loadEntry('renderers')
    window.modalZoom = createZoom('img', {
      loader: loadHdImage,
      margin: 24,
      renderer: dialog(),
    })
    // Resolves once the zoom has settled, with the high-resolution image still loading.
    await window.modalZoom.open()
  })
  const box = (selector: string) =>
    page.locator(selector).evaluate(frame => {
      const { left, top, width, height } = frame.getBoundingClientRect()
      return [left, top, width, height].map(Math.round)
    })
  const preview = await box('dialog img')
  // Already at its final size: the viewport less the margin in one dimension.
  const [width, height] = await page.evaluate(() => [
    document.documentElement.clientWidth - 48,
    document.documentElement.clientHeight - 48,
  ])
  expect(preview[2] === width || preview[3] === height).toBe(true)
  release()
  const sharp = page.locator('dialog img[src$="slow-zoom.jpg"]')
  await expect(sharp).toHaveCount(1)
  expect(await box('dialog img[src$="slow-zoom.jpg"]')).toEqual(preview)
  await expect(page.getByRole('dialog').getByRole('img')).toHaveCount(1)
})

test('pausing on an image preloads both neighbours, which then open sharp', async ({
  page,
}) => {
  await preparePage(page, {
    body: [0, 1, 2, 3]
      .map(
        index =>
          `<img src="/images/image-1.jpg" data-zoom-src="/hd-${index}.jpg" width="160" alt="Photo ${index + 1}">`
      )
      .join(''),
  })
  await addModernStyles(page)
  const requested: string[] = []
  await page.route('**/hd-*.jpg', route => {
    requested.push(new URL(route.request().url()).pathname)
    return route.fulfill({ path: 'stories/images/image-1.jpg' })
  })
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { galleryControls } = await window.loadEntry('gallery')
    const { loadHdImage } = await window.loadEntry('loaders')
    const { dialog } = await window.loadEntry('renderers')
    window.modalZoom = createZoom('img', {
      loader: loadHdImage,
      renderer: dialog({ content: galleryControls() }),
    })
    await window.modalZoom.open({
      target: document.querySelectorAll('img')[1]!,
    })
  })
  await expect
    .poll(() => [...new Set(requested)].sort())
    .toEqual(['/hd-0.jpg', '/hd-1.jpg', '/hd-2.jpg'])
  await page.getByRole('button', { name: 'Next image' }).click()
  await expect(page.locator('dialog img[src$="hd-2.jpg"]')).toHaveCount(1)
  // The new image's other neighbour follows.
  await expect
    .poll(() => [...new Set(requested)].sort())
    .toEqual(['/hd-0.jpg', '/hd-1.jpg', '/hd-2.jpg', '/hd-3.jpg'])
})

test('a quick step keeps the previous image on screen until the next one is decoded', async ({
  page,
}) => {
  await stockFixture(page, threeImages)
  await page.getByRole('button', { name: 'Mountain' }).click()
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
  const kept = await page.evaluate(async () => {
    const state = window as unknown as { decoded: () => void }
    const { prototype } = HTMLImageElement
    const decode = Object.getOwnPropertyDescriptor(prototype, 'decode')!
    prototype.decode = () =>
      new Promise<void>(resolve => (state.decoded = resolve))
    const { createGallery } = await window.loadEntry('gallery')
    void createGallery(window.modalZoom).select(1, { instant: true })
    Object.defineProperty(prototype, 'decode', decode)
    await new Promise(requestAnimationFrame)
    return document.querySelectorAll('dialog img').length
  })
  expect(kept).toBe(2)
  await page.evaluate(() =>
    (window as unknown as { decoded: () => void }).decoded()
  )
  await expect(page.locator('dialog img')).toHaveCount(1)
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
})

test('a high-resolution image smaller than the window keeps the size already shown', async ({
  page,
}) => {
  await preparePage(page, {
    body: '<img src="/images/image-1.thumbnail.jpg" data-zoom-src="/images/image-1x300.jpg" width="150" alt="Small">',
  })
  await addModernStyles(page)
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { loadHdImage } = await window.loadEntry('loaders')
    const { dialog } = await window.loadEntry('renderers')
    window.modalZoom = createZoom('img', {
      loader: loadHdImage,
      margin: 24,
      renderer: dialog(),
    })
    await window.modalZoom.open()
  })
  const sharp = page.locator('dialog img[src$="image-1x300.jpg"]')
  await expect(sharp).toHaveCount(1)
  // Measured once any transition the sharpening started has ended.
  await page.waitForFunction(() =>
    [...document.querySelectorAll('dialog img')].every(
      frame => !frame.getAnimations().length
    )
  )
  const boxes = await page
    .locator('dialog img')
    .evaluateAll(frames =>
      frames.map(frame => Math.round(frame.getBoundingClientRect().width))
    )
  // Neither shrinks to the image's own 300 pixels: both fill the window less the margin.
  const width = await page.evaluate(
    () => document.documentElement.clientWidth - 48
  )
  for (const box of boxes) {
    expect(box).toBeGreaterThan(300)
    expect(box).toBeLessThanOrEqual(width)
  }
  expect(new Set(boxes).size).toBe(1)
})

test('stock controls hide navigation for a single image', async ({ page }) => {
  await stockFixture(
    page,
    '<img src="/images/image-1.jpg" width="160" alt="Alone">'
  )
  await page.getByRole('button', { name: 'Alone' }).click()
  const modal = page.getByRole('dialog', { name: 'Alone' })
  await expect(page.locator('dialog')).toBeFocused()
  await expect(modal.getByRole('button', { name: /image/ })).toHaveCount(0)
  await expect(modal.getByRole('status')).toBeHidden()
})

test('the close button rests quieter than navigation and steps aside with it', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Hover and resting pointers need a mouse')
  await page.clock.install()
  await stockFixture(page, threeImages)
  await page.getByRole('button', { name: 'Forest' }).click()
  // The dialog holds initial focus, so no control lights up on open.
  await expect(page.locator('dialog')).toBeFocused()
  const close = page.getByRole('button', { name: 'Close' })
  // The icon brightens at once on hover; only the button as a whole fades.
  const icon = close.locator('svg')
  await expect(icon).toHaveCSS('opacity', '0.48')
  await expect(icon).toHaveCSS('transition-duration', '0s')
  await close.hover()
  await expect(icon).toHaveCSS('opacity', '1')
  await page.mouse.move(400, 300)
  await page.clock.runFor(2_100)
  await expect(close).toHaveCSS('opacity', '0')
  await page.mouse.move(420, 320)
  await expect(close).toHaveCSS('opacity', '1')
  await expect(icon).toHaveCSS('opacity', '0.48')
  await close.click()
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('the zoom travels with the page as it scrolls, until the scroll closes it', async ({
  page,
}) => {
  await stockFixture(page, threeImages)
  // The engine ignores scrolling until the zoom has settled open; the margin leaves
  // backdrop around the image.
  await page.evaluate(() => {
    window.modalZoom.update({ margin: 60 })
    return window.modalZoom.open({
      target: document.querySelectorAll('img')[1]!,
    })
  })
  const place = () =>
    page.evaluate(() => {
      const top = (selector: string) =>
        Math.round(
          document.querySelector(selector)!.getBoundingClientRect().top
        )
      return {
        image: top('dialog img'),
        next: top('.medium-zoom-control--next'),
        overlay: top('.medium-zoom-overlay'),
      }
    })
  const before = await place()
  await page.evaluate(() => window.scrollBy(0, 30))
  await expect.poll(place).toEqual({
    image: before.image - 30,
    next: before.next - 30,
    overlay: before.overlay,
  })
  // The dialog moved up with the page; the backdrop still covers the window's bottom edge.
  expect(
    await page.evaluate(
      () => document.elementFromPoint(2, innerHeight - 2)?.className
    )
  ).toBe('medium-zoom-overlay')
  await page.evaluate(() => window.scrollBy(0, 30))
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test('a class-toggled dark theme needs no configuration', async ({ page }) => {
  await stockFixture(page, threeImages)
  // A class alone: no color-scheme declaration, no media query.
  await page.addStyleTag({ content: '.dark{background:#111014;color:#eee}' })
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  await page.getByRole('button', { name: 'Forest' }).click()
  await expect(page.locator('.medium-zoom-overlay')).toHaveCSS(
    'background-color',
    'rgb(17, 16, 20)'
  )
  await expect(page.getByRole('button', { name: 'Next image' })).toHaveCSS(
    'color',
    'rgb(237, 237, 234)'
  )
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
  // The backdrop follows the theme as it is when the zoom opens.
  await page.evaluate(() => document.documentElement.classList.remove('dark'))
  await page.getByRole('button', { name: 'Forest' }).click()
  await expect(page.getByRole('button', { name: 'Next image' })).toHaveCSS(
    'color',
    'rgb(28, 28, 26)'
  )
})

test('an explicit background still wins over the page-matched backdrop', async ({
  page,
}) => {
  await stockFixture(page, threeImages)
  await page.addStyleTag({ content: 'html{background:#111014}' })
  await page.evaluate(async () => {
    window.modalZoom.update({ background: 'rgb(1, 2, 3)' })
    await window.modalZoom.open()
  })
  await expect(page.locator('.medium-zoom-overlay')).toHaveCSS(
    'background-color',
    'rgb(1, 2, 3)'
  )
})

test('stock controls and the backdrop follow a dark color scheme', async ({
  page,
}) => {
  await stockFixture(page, threeImages)
  await page.addStyleTag({ content: ':root{color-scheme:light dark}' })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.getByRole('button', { name: 'Forest' }).click()
  const next = page.getByRole('button', { name: 'Next image' })
  await expect(next).toHaveCSS('color', 'rgb(237, 237, 234)')
  await expect(page.locator('.medium-zoom-navigation')).toHaveCSS(
    'background-color',
    'rgba(28, 28, 26, 0.72)'
  )
  const backdrop = await page
    .locator('.medium-zoom-overlay')
    .evaluate(node => getComputedStyle(node).backgroundColor)
  expect(backdrop).not.toBe('rgb(255, 255, 255)')
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
  await page.emulateMedia({ colorScheme: 'light' })
  await page.getByRole('button', { name: 'Forest' }).click()
  await expect(next).toHaveCSS('color', 'rgb(28, 28, 26)')
  await expect(page.locator('.medium-zoom-overlay')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)'
  )
})

test('the position keeps its width when the count gains a digit', async ({
  page,
}) => {
  await stockFixture(
    page,
    Array.from(
      { length: 12 },
      (_, index) =>
        `<img src="/images/image-1.jpg" width="80" alt="Photo ${index + 1}">`
    ).join('')
  )
  await page.evaluate(() =>
    window.modalZoom.open({ target: document.querySelectorAll('img')[8]! })
  )
  const navigation = page.locator('.medium-zoom-navigation')
  await expect(page.getByRole('status')).toContainText('9 / 12')
  const nine = await navigation.evaluate(
    node => node.getBoundingClientRect().width
  )
  await page.getByRole('button', { name: 'Next image' }).click()
  await expect(page.getByRole('status')).toContainText('10 / 12')
  expect(
    await navigation.evaluate(node => node.getBoundingClientRect().width)
  ).toBe(nine)
})

test('stock controls take localized labels and positions', async ({ page }) => {
  await stockFixture(page, threeImages, {
    closeLabel: 'Fermer',
    previousLabel: 'Image précédente',
    nextLabel: 'Image suivante',
    positionLabel: 'Image {position} sur {total}',
  })
  await page.getByRole('button', { name: 'Forest' }).click()
  const modal = page.getByRole('dialog', { name: 'Forest' })
  await expect(modal.getByRole('status')).toContainText('2 / 3')
  await expect(modal.getByRole('status')).toContainText('Image 2 sur 3')
  await modal.getByRole('button', { name: 'Image suivante' }).click()
  const last = page.getByRole('dialog', { name: 'Ocean' })
  await expect(
    last.getByRole('button', { name: 'Image suivante' })
  ).toHaveAttribute('aria-disabled', 'true')
  await last.getByRole('button', { name: 'Fermer' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('a swipe navigates without its trailing click dismissing the zoom', async ({
  page,
}) => {
  await preparePage(page, { body: threeImages })
  await addModernStyles(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { galleryControls } = await window.loadEntry('gallery')
    const { dialog } = await window.loadEntry('renderers')
    const { slide } = await window.loadEntry('transitions')
    window.modalZoom = createZoom('img', {
      renderer: dialog({
        content: galleryControls(),
        transition: slide({ duration: 1_000 }),
      }),
    })
    await window.modalZoom.open()
  })
  // A pen drag still fires a click in a later task, on the frame that is now leaving.
  const swipe = (x: number) =>
    page
      .locator('dialog img')
      .last()
      .evaluate(async (frame, x) => {
        const box = frame.getBoundingClientRect()
        const start = { x: box.left + box.width / 2, y: box.top + 20 }
        const init = {
          bubbles: true,
          isPrimary: true,
          pointerId: 7,
          pointerType: 'pen',
        }
        frame.dispatchEvent(
          new PointerEvent('pointerdown', {
            ...init,
            clientX: start.x,
            clientY: start.y,
          })
        )
        // Quick moves, so the release is a flick.
        for (let step = 1; step <= 3; step++) {
          await new Promise(resolve => setTimeout(resolve, 16))
          frame.dispatchEvent(
            new PointerEvent('pointermove', {
              ...init,
              clientX: start.x + (x * step) / 3,
              clientY: start.y,
            })
          )
        }
        frame.dispatchEvent(
          new PointerEvent('pointerup', {
            ...init,
            clientX: start.x + x,
            clientY: start.y,
          })
        )
        await new Promise(resolve => setTimeout(resolve))
        frame.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      }, x)
  await swipe(-120)
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  await swipe(120)
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
  await page.locator('dialog img').last().dispatchEvent('click')
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('a second finger turns a swipe into a pinch, which never navigates', async ({
  page,
}) => {
  await stockFixture(page, threeImages)
  await page.getByRole('button', { name: 'Mountain' }).click()
  await page.locator('dialog img').evaluate(frame => {
    const touch = (type: string, pointerId: number, x: number) =>
      frame.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          isPrimary: pointerId === 1,
          pointerId,
          pointerType: 'touch',
          clientX: x,
          clientY: 200,
        })
      )
    touch('pointerdown', 1, 300)
    touch('pointerdown', 2, 340)
    touch('pointerup', 1, 100)
    touch('pointerup', 2, 360)
  })
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText('1 / 3')
})

test('real touch swipes navigate instead of being claimed by the browser', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'Synthesized touch input needs CDP')
  await stockFixture(page, threeImages)
  await page.getByRole('button', { name: 'Mountain' }).click()
  const client = await page.context().newCDPSession(page)
  const swipe = async (from: number, to: number) => {
    const y = 300
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: from, y }],
    })
    for (let step = 1; step <= 6; step++) {
      await client.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: from + ((to - from) * step) / 6, y }],
      })
    }
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
  }
  await swipe(300, 100)
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  await swipe(100, 300)
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toBeVisible()
})

test('one combined stylesheet styles the whole gallery', async ({ page }) => {
  await preparePage(page, { body: threeImages })
  await page.addStyleTag({ url: '/experimental/dist/gallery.css' })
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { galleryControls } = await window.loadEntry('gallery')
    const { dialog } = await window.loadEntry('renderers')
    window.modalZoom = createZoom('img', {
      renderer: dialog({ content: galleryControls() }),
    })
    await window.modalZoom.open()
  })
  await expect(page.locator('.medium-zoom-overlay')).toHaveCSS('opacity', '1')
  await expect(page.locator('.medium-zoom-navigation')).toHaveCSS(
    'position',
    'absolute'
  )
  // Built CSS reorders declarations: a font shorthand would reset the figures.
  await expect(page.locator('.medium-zoom-position')).toHaveCSS(
    'font-variant-numeric',
    'tabular-nums'
  )
  expect(
    await page.evaluate(
      () =>
        getComputedStyle(document.querySelector('dialog')!, '::backdrop')
          .backgroundColor
    )
  ).toBe('rgba(0, 0, 0, 0)')
})

test('control variables size, round, pace and pin the stock controls', async ({
  page,
}) => {
  await stockFixture(page, threeImages)
  await page.addStyleTag({
    content:
      ':root{--medium-zoom-control-size:32px;--medium-zoom-control-radius:4px;--medium-zoom-control-transition:0s}',
  })
  const closeBox = () =>
    page.locator('.medium-zoom-control--close').evaluate(node => {
      const { right, width } = node.getBoundingClientRect()
      return { right: innerWidth - right, width }
    })
  await page.evaluate(async () => {
    window.modalZoom.update({ margin: 120 })
    await window.modalZoom.open()
  })
  const close = page.getByRole('button', { name: 'Close' })
  await expect(close).toHaveCSS('border-radius', '4px')
  // The fade follows the variable; the press keeps its own short timing.
  await expect(close).toHaveCSS('transition-duration', /^0s/)
  // Centred in the 120 px margin from the button's real 32 px size.
  expect(await closeBox()).toEqual({ right: 44, width: 32 })
  await page.evaluate(async () => {
    await window.modalZoom.close()
    document.documentElement.style.setProperty(
      '--medium-zoom-control-inset',
      '8px'
    )
    await window.modalZoom.open()
  })
  expect(await closeBox()).toEqual({ right: 8, width: 32 })
})

test('stock controls follow theme properties and yield to application styles', async ({
  page,
}) => {
  await stockFixture(page, threeImages)
  await page.addStyleTag({
    content:
      ':root{--medium-zoom-control-color:rgb(1, 2, 3)}.medium-zoom-control{border-radius:0}',
  })
  await page.getByRole('button', { name: 'Mountain' }).click()
  const close = page.getByRole('button', { name: 'Close' })
  await expect(close).toHaveCSS('color', 'rgb(1, 2, 3)')
  await expect(close).toHaveCSS('border-radius', '0px')
  // No injected <style>, so strict CSP sites work: the only one is this test's own.
  await expect(page.locator('style')).toHaveCount(1)
})

test('a held arrow key accelerates and sharpens only where it stops, in place', async ({
  page,
}) => {
  await preparePage(page, {
    body: Array.from(
      { length: 24 },
      (_, index) =>
        `<img src="/images/image-1x300.jpg" data-zoom-src="/hd-${index}.jpg" width="160" alt="Photo ${index + 1}">`
    ).join(''),
  })
  await addModernStyles(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const requested: string[] = []
  await page.route('**/hd-*.jpg', route => {
    requested.push(new URL(route.request().url()).pathname)
    return route.fulfill({ path: 'stories/images/image-1.jpg' })
  })
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { galleryControls } = await window.loadEntry('gallery')
    const { loadHdImage } = await window.loadEntry('loaders')
    const { dialog } = await window.loadEntry('renderers')
    const { slide } = await window.loadEntry('transitions')
    window.modalZoom = createZoom('img', {
      loader: loadHdImage,
      renderer: dialog({ content: galleryControls(), transition: slide() }),
    })
    await window.modalZoom.open()
  })
  await expect(page.getByRole('status')).toContainText('Image 1 of 24')
  requested.length = 0
  const held = await page.evaluate(async () => {
    const dialog = document.querySelector('dialog')!
    const shown = dialog.querySelector('[role="status"] span')!
    const announced = shown.nextElementSibling!
    const steps: number[] = []
    const announcements: string[] = []
    new MutationObserver(() => steps.push(performance.now())).observe(shown, {
      childList: true,
      characterData: true,
      subtree: true,
    })
    new MutationObserver(() =>
      announcements.push(announced.textContent!)
    ).observe(announced, { childList: true })
    let frames = 0
    // The system repeats a held key about every 33 ms.
    for (let index = 0; index < 72; index++) {
      dialog.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowRight',
          bubbles: true,
          repeat: index > 0,
        })
      )
      await new Promise(resolve => setTimeout(resolve, 33))
      frames = Math.max(frames, dialog.querySelectorAll('img').length)
    }
    const released = shown.textContent
    const box = () =>
      [...dialog.querySelectorAll('img')].map(frame => {
        const { left, width } = frame.getBoundingClientRect()
        return [Math.round(left), Math.round(width)]
      })[0]
    await new Promise(resolve => setTimeout(resolve, 150))
    const preview = box()
    await new Promise(resolve => setTimeout(resolve, 900))
    const gaps = steps.slice(1).map((time, index) => time - steps[index]!)
    return {
      released,
      settled: shown.textContent,
      gaps,
      frames,
      announcements,
      preview,
      sharpened: box(),
    }
  })
  // Far fewer steps than repeats, each gap shorter than the first as the hold goes on.
  expect(held.gaps.length).toBeLessThan(30)
  expect(held.gaps.at(-1)!).toBeLessThan(held.gaps[0]! * 0.6)
  expect(Math.min(...held.gaps)).toBeGreaterThanOrEqual(50)
  expect(held.settled).toBe(held.released)
  // An image and its high-resolution copy are two frames: at most one image leaves at a time.
  expect(held.frames).toBeLessThanOrEqual(4)
  expect(held.announcements).toEqual([
    `Image ${held.settled!.split(' / ')[0]} of 24`,
  ])
  // The first press is an ordinary step; the held repeats load only where they stop, and
  // then the neighbours of where they stop.
  const stop = Number(held.settled!.split(' / ')[0]) - 1
  expect(requested.slice(0, 2)).toEqual(['/hd-1.jpg', `/hd-${stop}.jpg`])
  for (const path of requested.slice(2)) {
    expect([`/hd-${stop - 1}.jpg`, `/hd-${stop + 1}.jpg`]).toContain(path)
  }
  // The preview already had the sharpened image's size and place.
  expect(held.sharpened).toEqual(held.preview)
  await expect(page.locator('dialog img')).toHaveCount(2)
  await expect
    .poll(() =>
      page.locator('dialog img').evaluateAll(frames =>
        frames.map(frame => {
          const { left, top, width, height } = frame.getBoundingClientRect()
          return [
            Math.abs(Math.round(left + width / 2 - innerWidth / 2)),
            Math.abs(Math.round(top + height / 2 - innerHeight / 2)),
          ]
        })
      )
    )
    .toEqual([
      [0, 0],
      [0, 0],
    ])
})

test('stock controls step aside while the pointer rests and return when it moves', async ({
  page,
}) => {
  await page.clock.install()
  await stockFixture(page, threeImages)
  await page.getByRole('button', { name: 'Forest' }).click()
  const navigation = page.locator('.medium-zoom-navigation')
  await expect(navigation).toHaveCSS('opacity', '1')
  await page.clock.runFor(2_100)
  await expect(navigation).toHaveCSS('opacity', '0')
  await page.mouse.move(10, 10)
  await page.mouse.move(40, 40)
  await expect(navigation).toHaveCSS('opacity', '1')
  await page.keyboard.press('Tab')
  await page.clock.runFor(2_100)
  await expect(page.locator(':focus')).toHaveCSS('opacity', '1')
})

test('stock controls sit in the margin when it fits them, inside the image edge otherwise', async ({
  page,
}) => {
  await stockFixture(page, threeImages)
  const placement = async (margin: number) => {
    await page.evaluate(async margin => {
      await window.modalZoom.close()
      window.modalZoom.update({ margin })
      await window.modalZoom.open()
    }, margin)
    return page.evaluate(() => {
      const box = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect()
      return {
        close: innerWidth - box('.medium-zoom-control--close').right,
        navigation: innerHeight - box('.medium-zoom-navigation').bottom,
      }
    })
  }
  expect(await placement(0)).toEqual({ close: 12, navigation: 12 })
  expect(await placement(24)).toEqual({ close: 36, navigation: 36 })
  // 44 px controls centred in a 120 px gutter.
  expect(await placement(120)).toEqual({ close: 38, navigation: 38 })
})

test('the controls fade out as soon as the zoom starts closing', async ({
  page,
}) => {
  await stockFixture(page, threeImages)
  await page.addStyleTag({
    content: ':root{--medium-zoom-control-transition:0s}',
  })
  await page.evaluate(() => window.modalZoom.open())
  const opacities = await page.evaluate(() => {
    const read = () =>
      ['.medium-zoom-control--close', '.medium-zoom-navigation'].map(
        selector => getComputedStyle(document.querySelector(selector)!).opacity
      )
    const open = read()
    void window.modalZoom.close()
    return { open, closing: read() }
  })
  expect(opacities).toEqual({ open: ['1', '1'], closing: ['0', '0'] })
})

test('a held arrow key presses its button for as long as it is down', async ({
  page,
}) => {
  await stockFixture(page, threeImages)
  await page.getByRole('button', { name: 'Mountain' }).click()
  const next = page.getByRole('button', { name: 'Next image' })
  await page.keyboard.down('ArrowRight')
  await expect(page.getByRole('status')).toContainText('2 / 3')
  await expect(next).toHaveAttribute('data-pressed', '')
  await expect(next).toHaveCSS('scale', '0.9')
  await page.keyboard.up('ArrowRight')
  await expect(next).not.toHaveAttribute('data-pressed')
  await expect(next).toHaveCSS('scale', 'none')
  // Reaching the end disables the button, which then shows no press.
  await page.keyboard.down('ArrowRight')
  await expect(page.getByRole('status')).toContainText('3 / 3')
  await expect(next).toHaveCSS('scale', 'none')
  await page.keyboard.up('ArrowRight')
})
