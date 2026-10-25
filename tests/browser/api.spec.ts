import { test, expect } from '@playwright/test'
import { preparePage, loadBundle } from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await preparePage(page, {
    body: `
    <img id="first" src="/images/image-1.jpg" width="160" alt="First image">
    <img id="second" src="/images/image-2.jpg" width="160" alt="Second image">
    <div id="other"></div><div id="container" style="width:600px;height:400px"></div>
  `,
  })
  await loadBundle(page)
})

for (const [selector, expected] of [
  ['omitted', []],
  ['number', []],
  ['options', []],
  ['non-image', []],
  ['element', ['first']],
  ['string', ['first']],
  ['array', ['first', 'second']],
  ['mixed-array', ['first']],
  ['nodelist', ['first', 'second']],
  ['htmlcollection', []],
] as const) {
  test(`factory accepts ${selector} selectors`, async ({ page }) => {
    const images = await page.evaluate(selector => {
      const first = document.querySelector<HTMLImageElement>('#first')!
      const second = document.querySelector<HTMLImageElement>('#second')!
      const other = document.querySelector<HTMLDivElement>('#other')!
      const selectors = {
        omitted: undefined,
        number: 42,
        options: { margin: 24 },
        'non-image': other,
        element: first,
        string: '#first',
        array: [first, second],
        'mixed-array': [first, other],
        nodelist: document.querySelectorAll('img'),
        htmlcollection: document.images,
      }
      window.zoom = window.mediumZoom(selectors[selector] as never)
      return window.zoom.getImages().map(image => image.id)
    }, selector)
    expect(images).toEqual(expected)
  })
}

test('invalid CSS selectors produce the documented error', async ({ page }) => {
  const error = await page.evaluate(() => {
    try {
      window.mediumZoom('')
    } catch (error) {
      return { type: (error as Error).name, message: (error as Error).message }
    }
  })
  expect(error?.type).toBe('TypeError')
  expect(error?.message).toContain('The provided selector is invalid.')
})

test('factory defaults, options-only overload, and fluent methods remain available', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const empty = window.mediumZoom()
    window.zoom = window.mediumZoom({ margin: 24 })
    const zoom = window.zoom
    return {
      defaults: empty.getOptions(),
      initialTarget: empty.getZoomedImage(),
      margin: zoom.getOptions().margin,
      images: zoom.getImages().length,
      fluent:
        zoom
          .attach('#first')
          .update({ background: '#000' })
          .on('opened', () => {}) === zoom,
    }
  })
  expect(result).toEqual({
    defaults: { margin: 0, background: '#fff', scrollOffset: 40, container: null, template: null },
    initialTarget: null,
    margin: 24,
    images: 0,
    fluent: true,
  })
})

for (const method of ['attach', 'detach'] as const) {
  for (const selector of ['string', 'element', 'array', 'nodelist']) {
    test(`${method} accepts ${selector} selectors`, async ({ page }) => {
      const result = await page.evaluate(
        ({ method, selector }) => {
          const first = document.querySelector<HTMLImageElement>('#first')!
          const targets = {
            string: '#first',
            element: first,
            array: [first],
            nodelist: document.querySelectorAll('#first'),
          }
          const zoom = window.mediumZoom(method === 'detach' ? 'img' : undefined)
          const returned = zoom[method](targets[selector as keyof typeof targets])
          return { ids: zoom.getImages().map(image => image.id), fluent: returned === zoom }
        },
        { method, selector }
      )
      expect(result).toEqual({ ids: method === 'attach' ? ['first'] : ['second'], fluent: true })
    })
  }
}

test('repeated attachment is idempotent and detach() removes every image', async ({ page }) => {
  const result = await page.evaluate(() => {
    const zoom = window.mediumZoom('#first')
    zoom.attach('#first').attach('#second').attach('#second')
    const attached = zoom.getImages().map(image => image.id)
    zoom.detach()
    return {
      attached,
      remaining: zoom.getImages().length,
      classes: document.querySelectorAll('.medium-zoom-image').length,
    }
  })
  expect(result).toEqual({ attached: ['first', 'second'], remaining: 0, classes: 0 })
})

test('options update individually and coordinate containers merge', async ({ page }) => {
  const result = await page.evaluate(() => {
    const zoom = window.mediumZoom('img', { margin: 24, container: { width: 600, top: 10 } })
    zoom.update({ margin: 48 }).update({ background: '#123456' }).update({ scrollOffset: 0 })
    zoom.update({ container: { left: 20 } })
    return zoom.getOptions()
  })
  expect(result).toEqual({
    margin: 48,
    background: '#123456',
    scrollOffset: 0,
    container: { width: 600, top: 10, left: 20 },
    template: null,
  })
})

test('clone copies options without attached images or shared option updates', async ({ page }) => {
  const result = await page.evaluate(() => {
    const zoom = window.mediumZoom('img', { margin: 24, background: '#123456' })
    const clone = zoom.clone({ margin: 48 })
    clone.update({ background: '#000' })
    return {
      original: zoom.getOptions(),
      defaultClone: zoom.clone().getOptions(),
      undefinedClone: zoom.clone(undefined).getOptions(),
      clone: clone.getOptions(),
      images: clone.getImages().length,
    }
  })
  expect(result.original.margin).toBe(24)
  expect(result.original.background).toBe('#123456')
  expect(result.defaultClone).toEqual(result.original)
  expect(result.undefinedClone).toEqual(result.original)
  expect(result.clone.margin).toBe(48)
  expect(result.clone.background).toBe('#000')
  expect(result.images).toBe(0)
})

test('event handlers follow attachment and off removes only the selected handler', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const calls: string[] = []
    const removed = () => calls.push('removed')
    const retained = (event: Event) => calls.push((event.target as HTMLElement).id)
    const zoom = window.mediumZoom('#first').on('update', removed).on('update', retained)
    zoom.attach('#second').off('update', removed).update({ margin: 32 })
    zoom.detach('#first').update({ margin: 48 })
    zoom.off('update', retained).update({ margin: 64 })
    return calls
  })
  expect(result).toEqual(['first', 'second', 'second'])
})

test('open, close, and toggle resolve with the instance and expose the active original', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const zoom = window.mediumZoom('img')
    const target = document.querySelector<HTMLImageElement>('#second')!
    const calls: string[] = []
    for (const type of ['open', 'opened', 'close', 'closed']) zoom.on(type, () => calls.push(type))
    const opened = await zoom.open({ target })
    const active = zoom.getZoomedImage()?.id
    const closed = await zoom.close()
    const empty = zoom.getZoomedImage()
    await zoom.toggle()
    const toggled = zoom.getZoomedImage()?.id
    await zoom.toggle()
    return { opened: opened === zoom, closed: closed === zoom, active, empty, toggled, calls }
  })
  expect(result).toEqual({
    opened: true,
    closed: true,
    active: 'second',
    empty: null,
    toggled: 'first',
    calls: ['open', 'opened', 'close', 'closed', 'open', 'opened', 'close', 'closed'],
  })
})

test('once handlers run once and their custom event identifies the instance', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const zoom = window.mediumZoom('#first')
    let calls = 0
    let detailMatches = false
    zoom.on(
      'opened',
      event => {
        calls++
        detailMatches = (event as CustomEvent).detail.zoom === zoom
      },
      { once: true }
    )
    await zoom.open()
    await zoom.close()
    await zoom.open()
    await zoom.close()
    return { calls, detailMatches }
  })
  expect(result).toEqual({ calls: 1, detailMatches: true })
})

test('closing during opening cancels the zoom and allows reopening', async ({ page }) => {
  await page.evaluate(async () => {
    window.zoom = window.mediumZoom('#first')
    const opening = window.zoom.open()
    await window.zoom.close()
    await opening
  })
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  await page.evaluate(() => window.zoom.open())
  await page.keyboard.press('Escape')
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test('detach closes an open zoom and releases the images', async ({ page }) => {
  await page.evaluate(async () => {
    window.zoom = window.mediumZoom('img')
    await window.zoom.open()
    window.zoom.detach()
  })
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  await expect(page.locator('.medium-zoom-image')).toHaveCount(0)
  expect(await page.evaluate(() => window.zoom.getImages().length)).toBe(0)
})

test('an empty zoom can open and close before later attachment', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const zoom = window.mediumZoom()
    await zoom.open()
    await zoom.close()
    zoom.attach('#first')
    await zoom.open()
    const active = zoom.getZoomedImage()?.id
    await zoom.close()
    return active
  })
  expect(result).toBe('first')
})

test('viewport resize dismisses an open zoom', async ({ page }) => {
  await page.evaluate(async () => {
    window.zoom = window.mediumZoom('#first')
    await window.zoom.open()
  })
  await page.setViewportSize({ width: 1_000, height: 700 })
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test('overlay clicks dismiss while unrelated keys leave the zoom open', async ({ page }) => {
  await page.evaluate(async () => {
    window.zoom = window.mediumZoom('#first')
    await window.zoom.open()
  })
  await page.keyboard.press('Enter')
  await expect(page.locator('.medium-zoom-overlay')).toBeVisible()
  await page.locator('.medium-zoom-overlay').click({ position: { x: 4, y: 4 } })
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test('native browser listeners are registered only while needed', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const calls: string[] = []
    const relevant = new Set([
      'click',
      'keyup',
      'scroll',
      'resize',
      'touchstart',
      'touchend',
      'touchcancel',
    ])
    // Observe native calls without replacing their behavior.
    const addDocument = document.addEventListener.bind(document)
    const removeDocument = document.removeEventListener.bind(document)
    const addWindow = window.addEventListener.bind(window)
    const removeWindow = window.removeEventListener.bind(window)
    document.addEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) => {
      if (relevant.has(type)) calls.push(`document+${type}`)
      addDocument(type, listener, options)
    }
    document.removeEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ) => {
      if (relevant.has(type)) calls.push(`document-${type}`)
      removeDocument(type, listener, options)
    }
    window.addEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) => {
      if (relevant.has(type)) calls.push(`window+${type}`)
      addWindow(type, listener, options)
    }
    window.removeEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ) => {
      if (relevant.has(type)) calls.push(`window-${type}`)
      removeWindow(type, listener, options)
    }
    const zoom = window.mediumZoom()
    const empty = [...calls]
    zoom.attach('#first').attach('#first')
    const attached = [...calls]
    await zoom.open()
    await zoom.close()
    zoom.detach()
    return { empty, attached, calls }
  })
  expect(result.empty).toEqual([])
  expect(result.attached).toEqual(['document+click'])
  expect(result.calls).toEqual([
    'document+click',
    'document+keyup',
    'document+scroll',
    'document+touchstart',
    'document+touchend',
    'document+touchcancel',
    'window+resize',
    'document-keyup',
    'document-scroll',
    'document-touchstart',
    'document-touchend',
    'document-touchcancel',
    'window-resize',
    'document-click',
  ])
})

test('touch listeners are removed when browser event options accept only a boolean', async ({
  page,
}) => {
  const touchReads = await page.evaluate(async () => {
    const addDocument = document.addEventListener.bind(document)
    const removeDocument = document.removeEventListener.bind(document)
    // Older browsers coerce the options object to capture=true.
    document.addEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) => {
      addDocument(type, listener, Boolean(options))
    }
    document.removeEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ) => {
      removeDocument(type, listener, Boolean(options))
    }
    const zoom = window.mediumZoom('#first')
    await zoom.open()
    await zoom.close()
    zoom.detach()

    let reads = 0
    for (const type of ['touchstart', 'touchend', 'touchcancel']) {
      const event = new Event(type)
      Object.defineProperty(event, 'touches', {
        get() {
          reads++
          return { length: 2 }
        },
      })
      document.dispatchEvent(event)
    }
    return reads
  })
  expect(touchReads).toBe(0)
})

test('a missing HD image falls back to the original image', async ({ page }) => {
  await page.evaluate(async () => {
    document.querySelector('#first')!.setAttribute('data-zoom-src', '/images/missing.jpg')
    window.zoom = window.mediumZoom('#first')
    await window.zoom.open()
  })
  await expect(page.locator('.medium-zoom-image--opened')).toBeVisible()
  await page.evaluate(() => window.zoom.close())
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

test('unattached open targets leave the zoom closed', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const zoom = window.mediumZoom('#first')
    let opened = false
    zoom.on('open', () => {
      opened = true
    })
    const returned = await zoom.open({
      target: document.querySelector<HTMLImageElement>('#second')!,
    })
    return { fluent: returned === zoom, opened, target: zoom.getZoomedImage() }
  })
  expect(result).toEqual({ fluent: true, opened: false, target: null })
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
  await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(0)
})

test('repeated open and close calls are idempotent', async ({ page }) => {
  await page.evaluate(async () => {
    window.zoom = window.mediumZoom('#first')
    await window.zoom.open()
    await window.zoom.open()
  })
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(1)
  await expect(page.locator('.medium-zoom-image--opened')).toHaveCount(1)
  expect(
    await page.evaluate(async () => {
      const first = await window.zoom.close()
      const second = await window.zoom.close()
      return first === window.zoom && second === window.zoom
    })
  ).toBe(true)
  await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
})

for (const fallback of [false, true]) {
  test(`${fallback ? 'legacy' : 'native'} CustomEvent preserves event semantics`, async ({
    page,
  }) => {
    const result = await page.evaluate(fallback => {
      if (fallback) {
        Object.defineProperty(window, 'CustomEvent', { value: undefined, configurable: true })
      }
      const zoom = window.mediumZoom('#first')
      let observed
      zoom.on('update', event => {
        event.preventDefault()
        observed = {
          detailMatches: (event as CustomEvent).detail.zoom === zoom,
          target: (event.target as HTMLElement).id,
          bubbles: event.bubbles,
          cancelable: event.cancelable,
          defaultPrevented: event.defaultPrevented,
        }
      })
      zoom.update({ margin: 24 })
      return observed
    }, fallback)
    expect(result).toEqual({
      detailMatches: true,
      target: 'first',
      bubbles: false,
      cancelable: false,
      defaultPrevented: false,
    })
  })
}

test('attachment validates selectors, supports variadic nodes, and ignores HTMLCollection', async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const zoom = window.mediumZoom()
    let error = ''
    try {
      zoom.attach('')
    } catch (caught) {
      error = (caught as Error).message
    }
    zoom.attach(document.images as never)
    const ignored = zoom.getImages().length
    const first = document.querySelector<HTMLImageElement>('#first')!
    const second = document.querySelector<HTMLImageElement>('#second')!
    zoom.attach(first, second)
    zoom.detach(document.images as never)
    const attached = zoom.getImages().map(image => image.id)
    zoom.detach(first, second)
    return { error, ignored, attached, remaining: zoom.getImages().length }
  })
  expect(result.error).toContain('The provided selector is invalid.')
  expect(result).toMatchObject({ ignored: 0, attached: ['first', 'second'], remaining: 0 })
})
