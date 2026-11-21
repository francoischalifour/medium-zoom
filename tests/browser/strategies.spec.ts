import { expect, test } from '@playwright/test'

import { addModernStyles, preparePage } from './helpers'

for (const capabilities of [
  [],
  ['loader'],
  ['viewport'],
  ['content'],
  ['loader', 'viewport', 'content'],
]) {
  test(`explicit strategies: ${capabilities.join(', ') || 'core'}`, async ({ page }) => {
    await preparePage(page, {
      body: '<img id="image" src="/images/image-1.jpg" data-zoom-src="/images/image-2.jpg?hd" width="160" alt="Zoom fixture"><template id="caption"><p id="details">Caption</p></template>',
    })
    const requests: string[] = []
    page.on('request', request => requests.push(request.url()))
    await page.evaluate(async names => {
      const { createZoom } = await window.loadEntry('core')
      const { loadHdImage } = await window.loadEntry('loaders')
      const { containerBounds } = await window.loadEntry('viewport')
      const { templateContent } = await window.loadEntry('content')
      const { dialog } = await window.loadEntry('renderers')
      window.coreZoom = createZoom('#image', {
        margin: 12,
        ...(names.includes('loader') && { loader: loadHdImage }),
        ...(names.includes('viewport') && {
          viewport: containerBounds({
            width: 600,
            height: 400,
            left: 30,
            top: 40,
          }),
        }),
        ...(names.includes('content') && {
          renderer: dialog({ content: templateContent('#caption') }),
        }),
      })
    }, capabilities)
    await expect(page.locator('style')).toHaveCount(0)
    await addModernStyles(page)
    expect(await page.evaluate(() => window.coreZoom.getOptions())).toEqual({
      margin: 12,
      background: '#fff',
      scrollOffset: 40,
    })
    await page.evaluate(() => window.coreZoom.open())
    await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(
      capabilities.includes('loader') ? 2 : 1
    )
    await expect(page.locator('#details')).toHaveCount(capabilities.includes('content') ? 1 : 0)
    expect(requests.some(url => url.includes('?hd'))).toBe(capabilities.includes('loader'))
    if (capabilities.includes('viewport')) {
      const rect = await page.locator('.medium-zoom-image--opened').last().boundingBox()
      expect(rect!.x + rect!.width / 2).toBeCloseTo(315, 0)
      expect(rect!.y + rect!.height / 2).toBeCloseTo(220, 0)
    }
    await page.evaluate(() => window.coreZoom.close())
    await expect(page.locator('.medium-zoom-overlay,#details,dialog')).toHaveCount(0)
    await page.evaluate(async () => {
      window.coreZoom.detach()
      window.coreZoom = window.coreZoom.clone({ margin: 24 }).attach('#image')
      await window.coreZoom.open()
    })
    await expect(page.locator('#details')).toHaveCount(capabilities.includes('content') ? 1 : 0)
    await page.evaluate(() => window.coreZoom.close())
  })
}

test('viewport strategy remeasures layout and observes updated core margins', async ({ page }) => {
  await preparePage(page, {
    body: '<div id="bounds" style="position:fixed;left:20px;top:30px;width:600px;height:400px"></div><img id="image" src="/images/image-1.jpg" width="160" alt="Zoom">',
  })
  await addModernStyles(page)
  const result = await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { containerBounds } = await window.loadEntry('viewport')
    const element = document.querySelector<HTMLElement>('#bounds')!
    window.coreZoom = createZoom('#image', {
      viewport: containerBounds(element),
      margin: 10,
    })
    const center = () => {
      const box = document.querySelector('.medium-zoom-image--opened')!.getBoundingClientRect()
      return [box.x + box.width / 2, box.y + box.height / 2]
    }
    await window.coreZoom.open()
    const first = center()
    await window.coreZoom.close()
    element.style.left = '80px'
    element.style.width = '400px'
    window.coreZoom.update({ margin: 20 })
    await window.coreZoom.open()
    const second = center()
    await window.coreZoom.close()
    return { first, second, options: window.coreZoom.getOptions() }
  })
  expect(result.first[0]).toBeCloseTo(320, 0)
  expect(result.first[1]).toBeCloseTo(230, 0)
  expect(result.second[0]).toBeCloseTo(280, 0)
  expect(result.second[1]).toBeCloseTo(230, 0)
  expect(result.options).toEqual({
    margin: 20,
    background: '#fff',
    scrollOffset: 40,
  })
})

test('loader completion is single-use, canceled on close, and ignores late readiness', async ({
  page,
}) => {
  await preparePage(page)
  expect(
    await page.evaluate(async () => {
      const { createZoom } = await window.loadEntry('core')
      let ready!: () => void,
        canceled = 0,
        opened = 0
      window.coreZoom = createZoom('#image', {
        loader: (_context, done) => {
          ready = done
          return () => {
            canceled++
          }
        },
      })
      window.coreZoom.on('opened', () => opened++)
      const opening = window.coreZoom.open()
      await window.coreZoom.close()
      await opening
      ready()
      ready()
      return {
        canceled,
        opened,
        current: window.coreZoom.getZoomedImage(),
        nodes: document.querySelectorAll('.medium-zoom-image--opened').length,
      }
    })
  ).toEqual({ canceled: 1, opened: 0, current: null, nodes: 0 })
})

for (const kind of ['loader', 'viewport'] as const) {
  test(`${kind} strategy failures use normal engine cleanup`, async ({ page }) => {
    await preparePage(page)
    expect(
      await page.evaluate(async kind => {
        const { createZoom } = await window.loadEntry('core')
        const fail = () => {
          throw Error('Strategy failed')
        }
        const zoom = createZoom('#image', kind === 'loader' ? { loader: fail } : { viewport: fail })
        try {
          await zoom.open()
          return false
        } catch {
          await zoom.close()
          return zoom.getZoomedImage() === null && !document.querySelector('.medium-zoom-overlay')
        }
      }, kind)
    ).toBe(true)
  })
}

test('construction configuration is copied; clone retains strategies and core options stay independent', async ({
  page,
}) => {
  await preparePage(page)
  expect(
    await page.evaluate(async () => {
      const { createZoom } = await window.loadEntry('core')
      let calls = 0
      const config = {
        margin: 12,
        viewport: (bounds: { left: number; top: number; width: number; height: number }) => {
          calls++
          return bounds
        },
      }
      const zoom = createZoom('#image', config)
      config.margin = 99
      config.viewport = () => {
        throw Error('Mutated configuration')
      }
      const clone = zoom.clone({ margin: 24 }).attach('#image')
      await clone.open()
      await clone.close()
      return {
        calls,
        original: zoom.getOptions().margin,
        cloned: clone.getOptions().margin,
      }
    })
  ).toEqual({ calls: 1, original: 12, cloned: 24 })
})

test('template content follows renderer lifetime and preserves authored close presentation', async ({
  page,
}) => {
  await preparePage(page, {
    body: '<img id="image" src="/images/image-1.jpg" width="160" alt="Zoom"><template id="caption"><p id="details" style="opacity:.7">Caption</p></template>',
  })
  await addModernStyles(page)
  expect(
    await page.evaluate(async () => {
      const { createZoom } = await window.loadEntry('core')
      const { dialog } = await window.loadEntry('renderers')
      const { templateContent } = await window.loadEntry('content')
      const zoom = createZoom('#image', {
        renderer: dialog({ content: templateContent('#caption') }),
      })
      await zoom.open()
      const caption = document.querySelector<HTMLElement>('dialog #details')!
      const closing = zoom.close()
      const during = {
        connected: caption.isConnected,
        opacity: caption.style.opacity,
        transition: caption.style.transition,
      }
      await closing
      return { during, removed: !caption.isConnected }
    })
  ).toEqual({
    during: { connected: true, opacity: '0.7', transition: '' },
    removed: true,
  })
})

test('plain renderer content stays above the backdrop and closes through authored forms', async ({
  page,
}) => {
  await preparePage(page, {
    body: '<img id="image" src="/images/image-1.jpg" width="160" alt="Zoom"><template id="caption"><form method="dialog"><button autofocus>Done</button></form></template>',
  })
  await addModernStyles(page)
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { dialog } = await window.loadEntry('renderers')
    const { templateContent } = await window.loadEntry('content')
    window.coreZoom = createZoom('#image', {
      renderer: dialog({ content: templateContent('#caption') }),
    })
    await window.coreZoom.open()
  })
  await page.getByRole('button', { name: 'Done' }).click({ timeout: 3_000 })
  await expect(page.locator('dialog')).toHaveCount(0)
})

test('synchronous loader readiness still releases its returned cleanup once', async ({ page }) => {
  await preparePage(page, {
    body: '<img id="one" src="/images/image-1.jpg" width="160" alt="One"><img id="two" src="/images/image-2.jpg" width="160" alt="Two">',
  })
  await addModernStyles(page)
  expect(
    await page.evaluate(async () => {
      const { createZoom } = await window.loadEntry('core')
      const { dialog } = await window.loadEntry('renderers')
      const { createGallery } = await window.loadEntry('gallery')
      const cleaned: string[] = []
      const zoom = createZoom('img', {
        renderer: dialog(),
        loader: ({ original }, ready) => {
          ready()
          return () => {
            cleaned.push(original.id)
          }
        },
      })
      await zoom.open()
      await createGallery(zoom).next()
      await zoom.close()
      return cleaned
    })
  ).toEqual(['one', 'two'])
})

test('loader only supplies detached media and the engine owns its presentation and disposal', async ({
  page,
}) => {
  await preparePage(page)
  await addModernStyles(page)
  expect(
    await page.evaluate(async () => {
      const { createZoom } = await window.loadEntry('core')
      let contract: string[] = []
      const media = new Image()
      media.src = '/images/image-2.jpg'
      await media.decode()
      const zoom = createZoom('#image', {
        loader(context, ready) {
          contract = Object.keys(context).sort()
          ready(media)
        },
      })
      await zoom.open()
      const displayed =
        media.isConnected &&
        !!media.style.transform &&
        media.classList.contains('medium-zoom-image--opened')
      await zoom.close()
      return { contract, displayed, removed: !media.isConnected }
    })
  ).toEqual({ contract: ['clone', 'original'], displayed: true, removed: true })
})

test('content cleanup errors release the modal and session before rejecting close', async ({
  page,
}) => {
  await preparePage(page)
  expect(
    await page.evaluate(async () => {
      const { createZoom } = await window.loadEntry('core')
      const { dialog } = await window.loadEntry('renderers')
      const { createZoomSession } = await window.loadEntry('session')
      const zoom = createZoom('#image', {
        renderer: dialog({
          content: () => () => {
            throw Error('cleanup failed')
          },
        }),
      })
      const session = createZoomSession(zoom)
      await session.open()
      let message = ''
      try {
        await session.close()
      } catch (error) {
        message = (error as Error).message
      }
      await session.dispose()
      return {
        message,
        current: zoom.getZoomedImage(),
        removed: !document.querySelector('dialog,.medium-zoom-overlay'),
      }
    })
  ).toEqual({ message: 'cleanup failed', current: null, removed: true })
})

test('backdrop dismissal remains available across repeated openings', async ({ page }) => {
  await preparePage(page)
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    window.coreZoom = createZoom('#image')
    await window.coreZoom.open()
    await window.coreZoom.close()
    await window.coreZoom.open()
  })
  await page.locator('.medium-zoom-overlay').dispatchEvent('click')
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test('HD request attributes apply before fetching the replacement', async ({ page }) => {
  await preparePage(page, {
    body: '<img id="image" src="/images/image-1.jpg" data-zoom-src="https://photos.example/hd.jpg" crossorigin="anonymous" referrerpolicy="no-referrer" width="160" alt="Photo">',
  })
  let origin: string | undefined
  let referrer: string | undefined
  await page.route('https://photos.example/hd.jpg', async route => {
    const headers = await route.request().allHeaders()
    origin = headers.origin
    referrer = headers.referer
    await route.fulfill({
      path: 'stories/images/image-2.jpg',
      contentType: 'image/jpeg',
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  })
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { loadHdImage } = await window.loadEntry('loaders')
    const zoom = createZoom('#image', { loader: loadHdImage })
    await zoom.open()
    await zoom.close()
  })
  expect(origin).toBe(new URL(page.url()).origin)
  expect(referrer).toBeUndefined()
})

for (const kind of ['connected', 'incompatible'] as const) {
  test(`loader rejects ${kind} media through normal cleanup`, async ({ page }) => {
    await preparePage(page)
    expect(
      await page.evaluate(async kind => {
        const { createZoom } = await window.loadEntry('core')
        const source = document.querySelector<HTMLImageElement>('#image')!
        const zoom = createZoom(source, {
          loader: (_context, ready) =>
            // The runtime check covers untyped loaders that hand back other elements.
            ready(kind === 'connected' ? source : (document.createElement('div') as never)),
        })
        let rejected = false
        try {
          await zoom.open()
        } catch {
          rejected = true
        }
        await zoom.close()
        return {
          rejected,
          kept: source.isConnected,
          closed: !zoom.getZoomedImage(),
          removed: !document.querySelector('.medium-zoom-overlay'),
        }
      }, kind)
    ).toEqual({ rejected: true, kept: true, closed: true, removed: true })
  })
}

test('HD cancellation removes native callbacks before a late load error', async ({ page }) => {
  await preparePage(page, {
    body: '<img id="image" src="/images/image-1.jpg" width="160" alt="Photo" onerror="document.documentElement.dataset.hdError=\'dispatched\'">',
  })
  let release!: () => void
  const gate = new Promise<void>(resolve => {
    release = resolve
  })
  const warnings: string[] = []
  page.on('console', message => {
    if (message.type() === 'warning') {
      warnings.push(message.text())
    }
  })
  await page.route('**/cancelled-hd.jpg', async route => {
    await gate
    await route.fulfill({ status: 404, body: '' })
  })
  await page.evaluate(async () => {
    const { loadHdImage } = await window.loadEntry('loaders')
    const source = document.querySelector<HTMLImageElement>('#image')!
    source.setAttribute('data-zoom-src', '/cancelled-hd.jpg')
    const pending = window as Window & { cancelHd?: () => void }
    document.documentElement.dataset.hdCompletions = '0'
    pending.cancelHd =
      loadHdImage({ original: source, clone: source.cloneNode() as HTMLImageElement }, () => {
        document.documentElement.dataset.hdCompletions = '1'
      }) || undefined
    pending.cancelHd?.()
  })
  release()
  await expect(page.locator('html')).toHaveAttribute('data-hd-error', 'dispatched')
  await expect(page.locator('html')).toHaveAttribute('data-hd-completions', '0')
  expect(warnings).toEqual([])
  await page.evaluate(() => {
    delete (window as Window & { cancelHd?: () => void }).cancelHd
  })
})
