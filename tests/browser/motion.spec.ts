import { test, expect } from '@playwright/test'
import { loadZoomFixture } from './helpers.ts'

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`${reducedMotion}: lifecycle, template, and repeated zooms complete`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion })
    await loadZoomFixture(page, {
      body: `<img id="image" src="/images/image-1.jpg" width="160" alt="Zoom fixture">
        <template id="template"><button id="dismiss" style="position:fixed;top:0;right:0;z-index:10">Close</button></template>`,
    })
    const result = await page.evaluate(async () => {
      const zoom = window.zoom.update({ template: '#template' })
      const events: string[] = []
      const transitions: string[] = []
      document.addEventListener('transitionrun', event => {
        transitions.push((event.target as HTMLElement).className)
      })
      for (const type of ['open', 'opened', 'close', 'closed']) {
        zoom.on(type, () => events.push(type))
      }
      const templateDurations: string[] = []
      zoom.on('close', () => {
        templateDurations.push(
          getComputedStyle(document.querySelector('#dismiss')!.parentElement!).transitionDuration
        )
      })
      const returned: boolean[] = []
      for (let index = 0; index < 2; index++) {
        returned.push((await zoom.open()) === zoom)
        if (!document.body.classList.contains('medium-zoom--opened'))
          throw Error('Missing open class')
        returned.push((await zoom.close()) === zoom)
      }
      await new Promise(requestAnimationFrame)
      return { events, returned, transitions, templateDurations, active: zoom.getZoomedImage() }
    })
    expect(result.events).toEqual(Array(2).fill(['open', 'opened', 'close', 'closed']).flat())
    expect(result.returned).toEqual([true, true, true, true])
    expect(result.active).toBeNull()
    expect(result.templateDurations).toEqual(
      Array(2).fill(reducedMotion === 'reduce' ? '0s' : '0.15s')
    )
    if (reducedMotion === 'reduce') expect(result.transitions).toEqual([])
    else expect(result.transitions.some(name => name.includes('medium-zoom-image'))).toBe(true)
    await expect(
      page.locator('.medium-zoom-overlay, .medium-zoom-image--opened, #dismiss')
    ).toHaveCount(0)
    await expect(page.locator('#image')).toBeVisible()
    await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
  })
}

for (const phase of ['opening', 'closing'] as const) {
  test(`switching to reduced motion during ${phase} completes exactly once`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await loadZoomFixture(page)
    await page.addStyleTag({
      content:
        '@media (prefers-reduced-motion: no-preference) { .medium-zoom-image { transition-duration: 5s !important } }',
    })
    await page.evaluate(() => {
      const zoom = window.zoom
      for (const type of ['open', 'opened', 'close', 'closed']) {
        zoom.on(type, () => {
          const key = `motion${type}`
          document.body.dataset[key] = String(Number(document.body.dataset[key] || 0) + 1)
        })
      }
    })
    if (phase === 'closing') {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.evaluate(() => window.zoom.open())
      await page.emulateMedia({ reducedMotion: 'no-preference' })
    }
    await page.evaluate(phase => {
      void (phase === 'opening' ? window.zoom.open() : window.zoom.close()).then(() => {
        document.body.dataset.completed = 'true'
      })
    }, phase)
    await expect
      .poll(() =>
        page.evaluate(() =>
          document
            .getAnimations()
            .some(animation =>
              (animation.effect as KeyframeEffect).target?.classList.contains(
                'medium-zoom-image--opened'
              )
            )
        )
      )
      .toBe(true)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('body')).toHaveAttribute('data-completed', 'true')
    if (phase === 'opening') await page.evaluate(() => window.zoom.close())
    await expect(page.locator('.medium-zoom-overlay, .medium-zoom-image--opened')).toHaveCount(0)
    for (const type of ['open', 'opened', 'close', 'closed']) {
      await expect(page.locator('body')).toHaveAttribute(`data-motion${type}`, '1')
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.addStyleTag({
      content: '.medium-zoom-image { transition-duration: 30ms !important }',
    })
    await page.evaluate(async () => {
      await window.zoom.open()
      await window.zoom.close()
    })
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  })
}

test('zero-duration custom styles complete without transition events', async ({ page }) => {
  await loadZoomFixture(page)
  await page.addStyleTag({ content: '.medium-zoom-image { transition: none !important }' })
  await page.evaluate(async () => {
    await window.zoom.open()
    await window.zoom.close()
  })
  await expect(page.locator('.medium-zoom-overlay, .medium-zoom-image--opened')).toHaveCount(0)
  await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
})

test('an unchanged transform completes even when a transition duration is set', async ({
  page,
}) => {
  await loadZoomFixture(page)
  await page.addStyleTag({ content: '.medium-zoom-image { transform: none !important }' })
  await page.evaluate(async () => {
    await window.zoom.open()
    await window.zoom.close()
  })
  await expect(page.locator('.medium-zoom-overlay, .medium-zoom-image--opened')).toHaveCount(0)
})

for (const source of ['data-zoom-src', 'srcset'] as const) {
  test(`reduced motion completes ${source} loading and template dismissal`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await loadZoomFixture(page, {
      body: `<img id="image" src="/images/image-1.jpg" width="160" alt="Zoom fixture"
        ${source}="/images/image-2.jpg">
        <template id="template"><button id="dismiss" style="position:fixed;top:0;right:0;z-index:10">Close</button></template>`,
    })
    await page.evaluate(async () => {
      window.zoom.update({ template: '#template' }).on('opened', () => {
        document.querySelector('#dismiss')!.addEventListener('click', () => {
          void window.zoom.close()
        })
      })
      await window.zoom.open()
    })
    await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(2)
    await page.locator('#dismiss').click()
    await expect(
      page.locator('.medium-zoom-overlay, .medium-zoom-image--opened, #dismiss')
    ).toHaveCount(0)
    await expect(page.locator('#image')).toBeVisible()
  })
}

test('closing during opening waits for the reverse transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await loadZoomFixture(page)
  await page.addStyleTag({ content: '.medium-zoom-image { transition-duration: 1s !important }' })
  await page.evaluate(() => {
    document.body.dataset.motionEvents = ''
    let started = false
    document.addEventListener('transitionrun', event => {
      if (
        !started &&
        event.propertyName === 'transform' &&
        (event.target as Element).classList.contains('medium-zoom-image--opened')
      ) {
        started = true
        // Reverse a running transition rather than cancelling before its first frame.
        setTimeout(() => {
          void window.zoom.close().then(() => {
            document.body.dataset.completed = 'true'
          })
        }, 75)
      }
    })
    void window.zoom.open()
    document
      .querySelector('.medium-zoom-image--opened')!
      .addEventListener('transitionend', event => {
        if ((event as TransitionEvent).propertyName === 'transform') {
          document.body.dataset.motionEvents += 'transitionend,'
        }
      })
    window.zoom.on('closed', () => {
      document.body.dataset.motionEvents += 'closed,'
    })
  })
  await expect(page.locator('body')).toHaveAttribute('data-completed', 'true')
  await expect(page.locator('body')).toHaveAttribute('data-motion-events', 'transitionend,closed,')
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test('lifecycle completion has a fallback when animation frames are suspended', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await loadZoomFixture(page)
  const result = await page.evaluate(async () => {
    const requestFrame = window.requestAnimationFrame
    window.requestAnimationFrame = () => 0
    try {
      const opened = await window.zoom.open()
      const openedClass = document.body.classList.contains('medium-zoom--opened')
      const overlayOpacity = getComputedStyle(
        document.querySelector('.medium-zoom-overlay')!
      ).opacity
      const closed = await window.zoom.close()
      return {
        fluent: opened === window.zoom && closed === window.zoom,
        openedClass,
        overlayOpacity,
      }
    } finally {
      window.requestAnimationFrame = requestFrame
    }
  })
  expect(result).toEqual({ fluent: true, openedClass: true, overlayOpacity: '1' })
  await expect(page.locator('.medium-zoom-overlay, .medium-zoom-image--opened')).toHaveCount(0)
  await expect(page.locator('#image')).toBeVisible()
})
