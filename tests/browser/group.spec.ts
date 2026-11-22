import { expect, type Page, test } from '@playwright/test'

import { addModernStyles, preparePage } from './helpers'

declare global {
  interface Window {
    zooms: Record<string, import('../../src/core').ModalZoom>
    log: string[]
  }
}

const body = `<img id="mountain" src="/images/image-1.jpg" width="160" alt="Mountain">
  <img id="forest" src="/images/image-2.jpg" width="160" alt="Forest">
  <img id="ocean" src="/images/image-1.jpg" width="160" alt="Ocean">`

/** One zoom per image; `groups` names a zoom's group, `null` for none, or the default. */
async function fixture(page: Page, groups: Record<string, string | null> = {}) {
  await preparePage(page, { body })
  await addModernStyles(page)
  await page.evaluate(async groups => {
    const { createZoom, createZoomGroup } = await window.loadEntry('core')
    const { dialog } = await window.loadEntry('renderers')
    const made: Record<string, ReturnType<typeof createZoomGroup>> = {}
    window.log = []
    window.zooms = {}
    for (const id of ['mountain', 'forest', 'ocean']) {
      const name = groups[id]
      const zoom = createZoom(`#${id}`, {
        renderer: dialog(),
        ...(name === null
          ? { group: null }
          : name
            ? { group: (made[name] ||= createZoomGroup()) }
            : {}),
      })
      zoom
        .on('opened', () => window.log.push(`${id} opened`))
        .on('closed', event =>
          window.log.push(`${id} closed: ${event.detail.reason}`)
        )
      window.zooms[id] = zoom
    }
  }, groups)
}

const dialogs = (page: Page) => page.getByRole('dialog')

test('opening a zoom closes the open one of its group first', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => window.zooms.mountain!.open())
  await expect(dialogs(page)).toHaveAccessibleName('Mountain')
  await page.evaluate(() => window.zooms.forest!.open())
  await expect(dialogs(page)).toHaveCount(1)
  await expect(dialogs(page)).toHaveAccessibleName('Forest')
  expect(await page.evaluate(() => window.log)).toEqual([
    'mountain opened',
    'mountain closed: group',
    'forest opened',
  ])
  await page.keyboard.press('Escape')
  await expect(dialogs(page)).toHaveCount(0)
})

test('the latest request wins while the open zoom is closing', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => window.zooms.mountain!.open())
  const states = await page.evaluate(async () => {
    const { forest, ocean } = window.zooms
    await Promise.all([forest!.open(), ocean!.open()])
    return [forest!.getSnapshot().status, ocean!.getSnapshot().status]
  })
  expect(states).toEqual(['closed', 'open'])
  await expect(dialogs(page)).toHaveCount(1)
  await expect(dialogs(page)).toHaveAccessibleName('Ocean')
})

test('closing a zoom that waits for its group cancels its opening', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(() => window.zooms.mountain!.open())
  const status = await page.evaluate(async () => {
    const { forest } = window.zooms
    const opening = forest!.open()
    await forest!.close()
    await opening
    return forest!.getSnapshot().status
  })
  expect(status).toBe('closed')
  await expect(dialogs(page)).toHaveCount(0)
  expect(await page.evaluate(() => window.log)).toEqual([
    'mountain opened',
    'mountain closed: group',
  ])
})

test('zooms in other groups, or in none, stay open side by side', async ({
  page,
}) => {
  await fixture(page, { mountain: 'photos', forest: 'photos', ocean: null })
  await page.evaluate(async () => {
    await window.zooms.mountain!.open()
    await window.zooms.ocean!.open()
  })
  await expect(dialogs(page)).toHaveCount(2)
  await page.evaluate(() => window.zooms.forest!.open())
  await expect(page.getByRole('dialog', { name: 'Forest' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Ocean' })).toHaveCount(1)
  await expect(page.getByRole('dialog', { name: 'Mountain' })).toHaveCount(0)
})

test('a zoom recreated on the same image opens once the previous one has closed', async ({
  page,
}) => {
  await preparePage(page, { body })
  await addModernStyles(page)
  // As a framework effect does when it restarts: abort the old zoom, open a new one.
  const log = await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { dialog } = await window.loadEntry('renderers')
    const log: string[] = []
    const create = (name: string, signal: AbortSignal) =>
      createZoom('#mountain', { renderer: dialog(), signal })
        .on('opened', () => log.push(`${name} opened`))
        .on('closed', event =>
          log.push(`${name} closed: ${event.detail.reason}`)
        )
    const first = new AbortController()
    await create('first', first.signal).open()
    first.abort()
    await create('second', new AbortController().signal).open()
    log.push(`dialogs: ${document.querySelectorAll('dialog').length}`)
    return log
  })
  expect(log).toEqual([
    'first opened',
    'first closed: detach',
    'second opened',
    'dialogs: 1',
  ])
  await expect(dialogs(page)).toHaveAccessibleName('Mountain')
})

test('a zoom asked again while it waits opens what it was asked last', async ({
  page,
}) => {
  await preparePage(page, { body })
  await addModernStyles(page)
  const image = await page.evaluate(async () => {
    const { createZoom } = await window.loadEntry('core')
    const { dialog } = await window.loadEntry('renderers')
    const first = createZoom('#mountain', { renderer: dialog() })
    const gallery = createZoom('#forest, #ocean', { renderer: dialog() })
    await first.open()
    const [forest, ocean] = gallery.getImages()
    void gallery.open({ target: forest })
    await gallery.open({ target: ocean })
    return gallery.getSnapshot().image?.id
  })
  expect(image).toBe('ocean')
  await expect(dialogs(page)).toHaveAccessibleName('Ocean')
})

test('an opening while nothing is shown supersedes a zoom still waiting', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(async () => {
    const { mountain, forest, ocean } = window.zooms
    await mountain!.open()
    // Opened from a closed listener, once the group has nothing shown.
    mountain!.on('closed', () => void ocean!.open(), { once: true })
    await forest!.open()
  })
  await expect(dialogs(page)).toHaveCount(1)
  await expect(dialogs(page)).toHaveAccessibleName('Ocean')
  await expect
    .poll(() => page.evaluate(() => window.log))
    .toEqual(['mountain opened', 'mountain closed: group', 'ocean opened'])
})

test('a request for an image the zoom does not have leaves the group alone', async ({
  page,
}) => {
  await fixture(page)
  await page.evaluate(async () => {
    await window.zooms.mountain!.open()
    await window.zooms.forest!.open({
      target: document.querySelector<HTMLElement>('#ocean')!,
    })
  })
  await expect(dialogs(page)).toHaveAccessibleName('Mountain')
  expect(await page.evaluate(() => window.log)).toEqual(['mountain opened'])
})
