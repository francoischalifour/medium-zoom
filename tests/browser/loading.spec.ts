import { test, expect } from '@playwright/test'

import { loadZoomFixture, observeErrors } from './helpers.ts'

for (const source of ['srcset', 'data-zoom-src'] as const) {
  test(`${source} load failure falls back and remains dismissible`, async ({ page }) => {
    const errors = observeErrors(page)
    await loadZoomFixture(page)
    await page.route('**/broken.jpg', route => route.fulfill({ status: 404, body: '' }))
    const events = await page.evaluate(async source => {
      const image = document.querySelector<HTMLImageElement>('#image')!
      image.setAttribute(source, source === 'srcset' ? '/broken.jpg 2000w' : '/broken.jpg')
      const events: string[] = []
      for (const type of ['open', 'opened', 'close', 'closed']) {
        window.zoom.on(type, () => events.push(type))
      }
      await window.zoom.open()
      await window.zoom.close()
      return events
    }, source)
    expect(events).toEqual(['open', 'opened', 'close', 'closed'])
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
    expect(errors).toEqual([])
  })

  for (const dismiss of ['overlay', 'Escape', 'API'] as const) {
    test(`${source} pending load can be cancelled by ${dismiss} without stale callbacks`, async ({
      page,
    }) => {
      const errors = observeErrors(page)
      await loadZoomFixture(page)
      let release!: () => void
      const pending = new Promise<void>(resolve => {
        release = resolve
      })
      let completed!: () => void
      const responseCompleted = new Promise<void>(resolve => {
        completed = resolve
      })
      await page.route('**/slow.jpg', async route => {
        await pending
        await route.fulfill({ path: 'stories/images/image-2.jpg', contentType: 'image/jpeg' })
        completed()
      })
      await page.evaluate(source => {
        const image = document.querySelector<HTMLImageElement>('#image')!
        image.setAttribute(source, source === 'srcset' ? '/slow.jpg 2000w' : '/slow.jpg')
        document.documentElement.dataset.events = ''
        for (const type of ['open', 'opened', 'close', 'closed']) {
          window.zoom.on(type, () => {
            document.documentElement.dataset.events += `${type},`
          })
        }
        void window.zoom.open().then(result => {
          document.documentElement.dataset.settled = String(result === window.zoom)
        })
      }, source)
      await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
      if (dismiss === 'overlay') {
        await page.locator('.medium-zoom-overlay').click({ position: { x: 4, y: 4 }, force: true })
      } else if (dismiss === 'Escape') {
        await page.keyboard.press('Escape')
      } else {
        await page.evaluate(() => window.zoom.close())
      }
      await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
      await expect(page.locator('html')).toHaveAttribute('data-settled', 'true')
      await expect(page.locator('html')).toHaveAttribute('data-events', 'open,close,closed,')
      await expect(page.locator('#image')).not.toHaveClass(/medium-zoom-image--hidden/)
      await page.evaluate(async source => {
        document.querySelector('#image')!.removeAttribute(source)
        await window.zoom.open()
      }, source)
      release()
      await responseCompleted
      await page.evaluate(() => new Promise(requestAnimationFrame))
      // The old request completes while a new zoom owns the same overlay.
      await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(1)
      await page.keyboard.press('Escape')
      await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
      await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
      expect(errors).toEqual([])
    })
  }

  test(`${source} cached HD loads support repeated open and close`, async ({ page }) => {
    await loadZoomFixture(page)
    const events = await page.evaluate(async source => {
      const image = document.querySelector<HTMLImageElement>('#image')!
      image.setAttribute(
        source,
        source === 'srcset' ? '/images/image-1.jpg 2000w' : '/images/image-1.jpg'
      )
      const events: string[] = []
      window.zoom.on('opened', () => events.push('opened'))
      for (let i = 0; i < 3; i++) {
        await window.zoom.open()
        if (document.querySelectorAll('.medium-zoom-image--opened').length !== 2) {
          throw new Error('Missing HD clone')
        }
        await window.zoom.close()
      }
      return events
    }, source)
    expect(events).toEqual(['opened', 'opened', 'opened'])
    await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(0)
  })
}

for (const dismiss of ['overlay', 'Escape', 'API'] as const) {
  test(`opening transition can be cancelled by ${dismiss}`, async ({ page }) => {
    await loadZoomFixture(page)
    await page.evaluate(() => {
      document.documentElement.dataset.events = ''
      for (const type of ['open', 'opened', 'close', 'closed']) {
        window.zoom.on(type, () => {
          document.documentElement.dataset.events += `${type},`
        })
      }
      void window.zoom.open().then(() => {
        document.documentElement.dataset.settled = 'true'
      })
    })
    if (dismiss === 'overlay') {
      await page.locator('.medium-zoom-overlay').click({ position: { x: 4, y: 4 }, force: true })
    } else if (dismiss === 'Escape') {
      await page.keyboard.press('Escape')
    } else {
      await page.evaluate(() => window.zoom.close())
    }
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
    await expect(page.locator('html')).toHaveAttribute('data-settled', 'true')
    await expect(page.locator('html')).toHaveAttribute('data-events', 'open,close,closed,')
  })
}

test('open listeners can cancel synchronously and closed listeners can reopen', async ({
  page,
}) => {
  const errors = observeErrors(page)
  await loadZoomFixture(page)
  const events = await page.evaluate(async () => {
    const events: string[] = []
    for (const type of ['open', 'opened', 'close', 'closed']) {
      window.zoom.on(type, () => events.push(type))
    }
    window.zoom.on(
      'open',
      () => {
        void window.zoom.close()
      },
      { once: true }
    )
    window.zoom.on(
      'closed',
      () => {
        void window.zoom.open()
      },
      { once: true }
    )
    await window.zoom.open()
    await new Promise<void>(resolve => window.zoom.on('opened', () => resolve(), { once: true }))
    await window.zoom.close()
    return events
  })
  expect(events).toEqual(['open', 'close', 'closed', 'open', 'opened', 'close', 'closed'])
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('a zero-sized broken srcset image settles without a transform transition', async ({
  page,
}) => {
  await loadZoomFixture(page)
  await page.route('**/broken.jpg', route => route.fulfill({ status: 404, body: '' }))
  const result = await page.evaluate(async () => {
    const image = document.querySelector<HTMLImageElement>('#image')!
    image.style.width = '0px'
    image.style.height = '0px'
    image.srcset = '/broken.jpg 2000w'
    const opened = await window.zoom.open()
    const closed = await window.zoom.close()
    return opened === window.zoom && closed === window.zoom
  })
  expect(result).toBe(true)
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test('detach cancels a pending HD load and removes its template', async ({ page }) => {
  const errors = observeErrors(page)
  await loadZoomFixture(page)
  await page.route('**/pending.jpg', () => {})
  await page.evaluate(async () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<template id="template"><p id="content">Zoom</p></template>'
    )
    document.querySelector('#image')!.setAttribute('data-zoom-src', '/pending.jpg')
    window.zoom.update({ template: '#template' })
    const opening = window.zoom.open()
    window.zoom.detach()
    await opening
  })
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  await expect(page.locator('#content')).toHaveCount(0)
  await expect(page.locator('.medium-zoom-image')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('srcset waits for the larger candidate after removing sizes', async ({ page }) => {
  await loadZoomFixture(page)
  let release!: () => void
  const pending = new Promise<void>(resolve => {
    release = resolve
  })
  await page.route('**/large.jpg', async route => {
    await pending
    await route.fulfill({ path: 'stories/images/image-2.jpg', contentType: 'image/jpeg' })
  })
  await page.evaluate(async () => {
    const image = document.querySelector<HTMLImageElement>('#image')!
    image.sizes = '160px'
    image.srcset = '/images/image-1.jpg 320w, /large.jpg 2000w'
    await image.decode()
    void window.zoom.open().then(() => {
      document.documentElement.dataset.settled = 'true'
    })
  })
  await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(1)
  await expect(page.locator('html')).not.toHaveAttribute('data-settled', 'true')
  release()
  await expect(page.locator('html')).toHaveAttribute('data-settled', 'true')
  const hd = page.locator('.medium-zoom-image--opened').last()
  expect(await hd.evaluate(image => (image as HTMLImageElement).currentSrc)).toContain('/large.jpg')
  await page.evaluate(() => window.zoom.close())
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test('a broken srcset-only image can open and close (#226)', async ({ page }) => {
  const errors = observeErrors(page)
  await loadZoomFixture(page)
  await page.route('**/missing-*.jpg', route => route.fulfill({ status: 404, body: '' }))
  const result = await page.evaluate(async () => {
    const image = document.createElement('img')
    image.srcset = '/missing-300.jpg 300w, /missing-600.jpg 600w'
    document.body.appendChild(image)
    await image.decode().catch(() => {})
    const zoom = window.mediumZoom(image)
    const opened = await zoom.open()
    const clones = document.querySelectorAll('.medium-zoom-image--opened').length
    const closed = await zoom.close()
    return {
      clones,
      opened: opened === zoom,
      closed: closed === zoom,
      active: zoom.getZoomedImage(),
    }
  })
  expect(result).toEqual({ clones: 1, opened: true, closed: true, active: null })
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  await expect(page.locator('.medium-zoom-image--hidden')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('open listeners configure the current geometry, template, and HD source', async ({ page }) => {
  await loadZoomFixture(page)
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<template id="template"><p id="content">Zoom</p></template>'
    )
    window.zoom.on('open', () => {
      window.zoom.update({ margin: 300, template: '#template' })
      document.querySelector('#image')!.setAttribute('data-zoom-src', '/images/image-2.jpg')
    })
  })
  await page.evaluate(() => window.zoom.open())
  await expect(page.locator('#content')).toBeVisible()
  const clones = page.locator('.medium-zoom-image--opened')
  await expect(clones).toHaveCount(2)
  expect(await clones.last().evaluate(image => (image as HTMLImageElement).currentSrc)).toContain(
    '/images/image-2.jpg'
  )
  const bounds = await clones.first().boundingBox()
  const viewport = page.viewportSize()!
  expect(bounds!.width).toBeLessThanOrEqual(viewport.width - 600 + 1)
  expect(bounds!.height).toBeLessThanOrEqual(viewport.height - 600 + 1)
  await page.evaluate(() => window.zoom.close())
  await expect(page.locator('#content')).toHaveCount(0)
})

test('continuous scrolling dismisses without waiting for scrolling to stop', async ({ page }) => {
  await loadZoomFixture(page)
  await page.evaluate(() => window.zoom.open())
  // Keep scrolling longer than the dismissal delay and closing animation together.
  const closedWhileScrolling = await page.evaluate(async () => {
    let closed = false
    window.zoom.on('closed', () => {
      closed = true
    })
    const scrolling = setInterval(() => window.scrollBy(0, 5), 20)
    try {
      await new Promise(resolve => setTimeout(resolve, 1_000))
      return closed
    } finally {
      clearInterval(scrolling)
    }
  })
  expect(closedWhileScrolling).toBe(true)
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})
