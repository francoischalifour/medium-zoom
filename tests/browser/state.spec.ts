import { expect, type Page, test } from '@playwright/test'

import { addModernStyles, loadBundle, preparePage } from './helpers'

declare global {
  interface Window {
    statuses: string[]
    reasons: string[]
    closeEvents: string[]
  }
}

const body = `<img id="first" src="/images/image-1.jpg" width="160" alt="First">
  <img id="second" src="/images/image-2.jpg" width="160" alt="Second">`

async function modal(page: Page) {
  await preparePage(page, { body })
  await addModernStyles(page)
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { dialog } = await window.loadEntry('renderers')
    window.statuses = []
    window.reasons = []
    window.modalZoom = createZoom('#first', {
      renderer: dialog({
        content: ({ element, close }) => {
          const button = document.createElement('button')
          button.id = 'control'
          button.textContent = 'Close'
          button.addEventListener('click', close)
          const form = document.createElement('form')
          form.method = 'dialog'
          form.innerHTML = '<button id="submit">Done</button>'
          element.append(button, form)
          return () => {
            button.remove()
            form.remove()
          }
        },
      }),
    })
    window.modalZoom.subscribe(() =>
      window.statuses.push(window.modalZoom.getSnapshot().status)
    )
    window.modalZoom.on('closed', event =>
      window.reasons.push(event.detail.reason)
    )
  })
}

test('the snapshot follows the lifecycle and is frozen and stable', async ({
  page,
}) => {
  await modal(page)
  const initial = await page.evaluate(() => {
    const zoom = window.modalZoom
    const state = zoom.getSnapshot()
    return {
      same: state === zoom.getSnapshot(),
      frozen: Object.isFrozen(state) && Object.isFrozen(state.images),
      status: state.status,
      image: state.image,
      images: state.images.map(image => image.id),
    }
  })
  expect(initial).toEqual({
    same: true,
    frozen: true,
    status: 'closed',
    image: null,
    images: ['first'],
  })

  await page.evaluate(() => window.modalZoom.open())
  expect(
    await page.evaluate(() => window.modalZoom.getSnapshot().image?.id)
  ).toBe('first')
  await page.evaluate(() => window.modalZoom.close())
  expect(await page.evaluate(() => window.statuses)).toEqual([
    'opening',
    'open',
    'closing',
    'closed',
  ])

  const collection = await page.evaluate(() => {
    const zoom = window.modalZoom
    const before = zoom.getSnapshot().images
    const unchanged = zoom.getSnapshot().images === before
    zoom.attach('#second')
    const after = zoom.getSnapshot().images
    zoom.detach('#first')
    return {
      unchanged,
      replaced: after !== before && Object.isFrozen(after),
      after: after.map(image => image.id),
      detached: zoom.getSnapshot().images.map(image => image.id),
    }
  })
  expect(collection).toEqual({
    unchanged: true,
    replaced: true,
    after: ['first', 'second'],
    detached: ['second'],
  })
})

test('getters hand out copies the application cannot use to change the zoom', async ({
  page,
}) => {
  await modal(page)
  const result = await page.evaluate(() => {
    const zoom = window.modalZoom
    zoom.getImages().length = 0
    zoom.getOptions().margin = 99
    return {
      images: zoom.getImages().length,
      margin: zoom.getOptions().margin,
      fresh: zoom.getImages() !== zoom.getImages(),
    }
  })
  expect(result).toEqual({ images: 1, margin: 0, fresh: true })
})

test('close and closed events report why the zoom closed', async ({ page }) => {
  await modal(page)
  const open = () =>
    page.evaluate(() =>
      window.modalZoom.open({ target: window.modalZoom.getImages()[0] })
    )
  const closed = (count: number) =>
    expect.poll(() => page.evaluate(() => window.reasons.length)).toBe(count)

  await open()
  await page.evaluate(() => window.modalZoom.close())
  await closed(1)

  await open()
  await page.evaluate(() => window.modalZoom.close({ reason: 'control' }))
  await closed(2)

  await open()
  await page.keyboard.press('Escape')
  await closed(3)

  await open()
  await page.locator('#control').click()
  await closed(4)

  await open()
  await page.locator('#submit').click()
  await closed(5)

  await open()
  await page.locator('dialog img.medium-zoom-image--opened').first().click()
  await closed(6)

  await open()
  // As an event listener, close() receives the event: that is an API call.
  await page.evaluate(() => {
    const button = document.createElement('button')
    button.addEventListener(
      'click',
      window.modalZoom.close as unknown as EventListener
    )
    button.click()
  })
  await closed(7)

  await open()
  await page.evaluate(() => window.modalZoom.detach())
  await closed(8)

  expect(await page.evaluate(() => window.reasons)).toEqual([
    'api',
    'control',
    'escape-key',
    'control',
    'form',
    'image-press',
    'api',
    'detach',
  ])
})

test('close details carry the DOM event behind each reason', async ({
  page,
}) => {
  await modal(page)
  await page.evaluate(() => {
    window.closeEvents = []
    window.modalZoom.on('closed', ({ detail }) =>
      window.closeEvents.push(
        `${detail.reason}:${detail.event ? `${detail.event.constructor.name} ${detail.event.type}` : 'none'}`
      )
    )
  })
  const open = () =>
    page.evaluate(() =>
      window.modalZoom.open({ target: window.modalZoom.getImages()[0] })
    )
  const closed = (count: number) =>
    expect
      .poll(() => page.evaluate(() => window.closeEvents.length))
      .toBe(count)

  await open()
  await page.keyboard.press('Escape')
  await closed(1)

  await open()
  await page.locator('#control').click()
  await closed(2)

  await open()
  await page.locator('#submit').click()
  await closed(3)

  await open()
  await page.locator('dialog img.medium-zoom-image--opened').first().click()
  await closed(4)

  await open()
  // The backdrop covers the window: a click in a corner away from the controls lands on it.
  const { width, height } = page.viewportSize()!
  await page.mouse.click(width - 4, height - 4)
  await closed(5)

  await open()
  await page.evaluate(() => window.modalZoom.close())
  await closed(6)

  await open()
  // A close request without Escape, as the Android back gesture sends.
  await page.evaluate(() =>
    document
      .querySelector('dialog')!
      .dispatchEvent(new Event('cancel', { cancelable: true }))
  )
  await closed(7)

  await open()
  await page.evaluate(() =>
    window.modalZoom.close({
      reason: 'control',
      event: new MouseEvent('click'),
    })
  )
  await closed(8)

  // Clicks are pointer events in some browsers and mouse events in others.
  const events = await page.evaluate(() => window.closeEvents)
  expect(events[0]).toBe('escape-key:KeyboardEvent keydown')
  expect(events[1]).toMatch(/^control:(Pointer|Mouse)Event click$/)
  expect(events[2]).toBe('form:SubmitEvent submit')
  expect(events[3]).toMatch(/^image-press:(Pointer|Mouse)Event click$/)
  expect(events[4]).toMatch(/^outside-press:(Pointer|Mouse)Event click$/)
  expect(events.slice(5)).toEqual([
    'api:none',
    'back:Event cancel',
    'control:MouseEvent click',
  ])
})

test('the first reason wins while a close is under way', async ({ page }) => {
  await modal(page)
  await page.evaluate(() => window.modalZoom.open())
  const reasons = await page.evaluate(async () => {
    const zoom = window.modalZoom
    const seen: string[] = []
    zoom.on('close', event => seen.push(event.detail.reason))
    await Promise.all([
      zoom.close({ reason: 'control' }),
      zoom.close({ reason: 'escape-key' }),
    ])
    return [...seen, ...window.reasons]
  })
  expect(reasons).toEqual(['control', 'control'])
})

test('a zoom without a renderer closes on scroll with a scroll reason', async ({
  page,
}) => {
  await preparePage(page, { body })
  await addModernStyles(page)
  await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    window.reasons = []
    window.coreZoom = createZoom('#first')
    window.coreZoom.on('closed', event =>
      window.reasons.push(event.detail.reason)
    )
    await window.coreZoom.open()
  })
  await page.mouse.wheel(0, 400)
  await expect
    .poll(() => page.evaluate(() => window.reasons))
    .toEqual(['scroll'])
})

test('the gallery snapshot is frozen and shares the zoom images', async ({
  page,
}) => {
  await modal(page)
  const result = await page.evaluate(async () => {
    const { createGallery } = await window.loadEntry('gallery')
    const zoom = window.modalZoom
    zoom.attach('#second')
    const gallery = createGallery(zoom)
    await zoom.open()
    const snapshot = gallery.getSnapshot()
    const shared = snapshot.images === zoom.getSnapshot().images
    let notified = 0
    gallery.subscribe(() => notified++)
    await gallery.next()
    const next = gallery.getSnapshot()
    const changes = notified
    await zoom.close()
    gallery.dispose()
    return {
      frozen: Object.isFrozen(snapshot),
      shared,
      index: [snapshot.index, next.index],
      notified: changes,
    }
  })
  expect(result.frozen).toBe(true)
  expect(result.shared).toBe(true)
  expect(result.index).toEqual([0, 1])
  // Replacing the image is one change; a status change alone does not notify.
  expect(result.notified).toBe(1)
})

test('the presets keep their v1 events and have no state', async ({ page }) => {
  await preparePage(page, { body })
  await loadBundle(page)
  const result = await page.evaluate(async () => {
    const zoom = window.mediumZoom('#first')
    const details: string[][] = []
    zoom.on('closed', event =>
      details.push(Object.keys((event as CustomEvent).detail))
    )
    await zoom.open()
    await zoom.close()
    return {
      details,
      snapshot: 'getSnapshot' in zoom,
      images: zoom.getImages() === zoom.getImages(),
    }
  })
  expect(result).toEqual({
    details: [['zoom']],
    snapshot: false,
    images: true,
  })
})

test('a failing subscriber is reported and the zoom still opens and closes', async ({
  page,
}) => {
  await modal(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.evaluate(() => {
    window.modalZoom.subscribe(() => {
      throw new Error('subscriber failed')
    })
  })
  await page.evaluate(() => window.modalZoom.open())
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => window.statuses)).toEqual([
    'opening',
    'open',
    'closing',
    'closed',
  ])
  expect(errors.length).toBe(4)
  expect(new Set(errors)).toEqual(new Set(['subscriber failed']))
})

test('a once listener waits for its own zoom on a shared image', async ({
  page,
}) => {
  await preparePage(page, { body })
  await addModernStyles(page)
  const heard = await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { dialog } = await window.loadEntry('renderers')
    const own = createZoom('#first', { renderer: dialog(), group: null })
    const other = createZoom('#first', { renderer: dialog(), group: null })
    const heard: boolean[] = []
    own.on(
      'opened',
      event => heard.push(event.detail.zoom === (own as unknown)),
      { once: true }
    )
    await other.open()
    await other.close()
    await own.open()
    await own.close()
    await own.open()
    await own.close()
    return heard
  })
  expect(heard).toEqual([true])
})
