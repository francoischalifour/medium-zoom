import { test, expect, type Page } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
import {
  openImage,
  dismissZoom,
  decodeImages,
  finishAnimations,
  observeErrors,
  acceptAlerts,
} from './helpers.ts'
import { readStories, observeStoryEvents, captureStory } from './stories.helpers.ts'

const unattachedStories = new Set([
  'detach()/with multiple selectors',
  'detach()/all',
  'off()/detach',
  'on()/detach',
  'getOptions()/default',
])

const storyGroups = 8

// Small groups can run concurrently and retry without repeating the entire catalogue.
for (let group = 0; group < storyGroups; group++) {
  test(`API stories (group ${group + 1}/${storyGroups})`, async ({ page }, testInfo) => {
    test.setTimeout(60_000)
    const errors = observeErrors(page)
    const alerts = acceptAlerts(page)
    const evidence: { id: string; before: string; after: string; action: string }[] = []
    await observeStoryEvents(page)
    const stories = await readStories(page)
    expect(stories).toHaveLength(43)
    expect(new Set(stories.map(story => story.id)).size).toBe(43)

    for (const [index, story] of stories.entries()) {
      if (index % storyGroups !== group) continue
      await test.step(story.id, async () => {
        alerts.length = 0
        await page.goto(story.url)
        await expect(page.locator('html')).toHaveAttribute('data-ready', 'true')
        await assertInitialState(page, story.id)
        const before = await captureStory(page, testInfo, { story, index, state: 'before' })
        await demonstrateStory(page, story.id)
        const after = await captureStory(page, testInfo, { story, index, state: 'after' })
        await dismissStory(page, story.id)
        expect(alerts).toEqual(expectedAlerts(story.id))
        expect(errors).toEqual([])
        const action = unattachedStories.has(story.id)
          ? 'verify unattached image stays closed'
          : 'open and dismiss'
        evidence.push({ id: story.id, before, after, action })
      })
    }
    await writeFile(testInfo.outputPath('stories.json'), JSON.stringify(evidence, null, 2))
  })
}

async function assertInitialState(page: Page, id: string) {
  const automaticClose = /^(close|toggle)\(\)\//.test(id)
  const automaticOpen = id.startsWith('open()/')
  if (automaticClose || automaticOpen) {
    await expect
      .poll(() => page.evaluate(() => window.storyEvents.at(-1)?.type))
      .toBe(automaticClose ? 'closed' : 'opened')
    const events = await page.evaluate(() => window.storyEvents)
    expect(events.map(event => event.type)).toEqual(
      automaticClose ? ['open', 'opened', 'close', 'closed'] : ['open', 'opened']
    )
    expect(events[0].target).toBe(id.endsWith('/with target') ? 'image-2' : 'image-1')
  }
  if (automaticOpen) await page.evaluate(() => window.zoom.close())
  if (id === 'getOptions()/default') {
    expect(await page.evaluate(() => window.zoom.getOptions())).toMatchObject({
      margin: 48,
      background: '#000',
    })
  }
  if (id === 'getImages()/default') {
    expect(await page.evaluate(() => window.zoom.getImages().length)).toBe(2)
  }
  if (id === 'getZoomedImage()/default') {
    expect(await page.evaluate(() => window.zoom.getZoomedImage())).toBeNull()
  }
}

async function demonstrateStory(page: Page, id: string) {
  if (id === 'on()/detach') await page.locator('#detach').click()
  if (id === 'update()/multiple options') {
    await page.locator('#update').click()
    expect(await page.evaluate(() => window.zoom.getOptions())).toMatchObject({
      margin: 100,
      background: 'yellow',
      scrollOffset: 0,
    })
  }
  if (unattachedStories.has(id)) {
    await expect(page.locator('.medium-zoom-image')).toHaveCount(0)
    await page.locator('img').first().click()
    await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
    return
  }
  const images = page.locator('.medium-zoom-image:not(.medium-zoom-image--opened)')
  if (id.startsWith('detach()/')) {
    await expect(page.locator('#image-1')).not.toHaveClass(/medium-zoom-image/)
    await expect(images).toHaveCount(1)
  }
  await openImage(page, images.first())
  await decodeImages(page.locator('img.medium-zoom-image--opened'))
  await finishAnimations(page)
  await expect(page.locator('.medium-zoom-overlay')).toHaveCSS('opacity', '1')
  if (id === 'getZoomedImage()/default') {
    expect(
      await page.evaluate(() => window.zoom.getZoomedImage() === document.querySelector('img'))
    ).toBe(true)
  }
  if (id === 'clone()/with margin') {
    await expect(page.locator('.medium-zoom-overlay')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
    const bounds = await page.locator('.medium-zoom-image--opened').first().boundingBox()
    expect(bounds!.y).toBeGreaterThanOrEqual(99)
  }
}

async function dismissStory(page: Page, id: string) {
  if (unattachedStories.has(id)) return
  const template = await page.locator('svg[data-zoom-close]').count()
  const via = template ? 'template' : id === 'options/scrollOffset' ? 'scroll' : 'keyboard'
  await dismissZoom(page, { via })
  if (id === 'on()/open only once') {
    await openImage(page, page.locator('.medium-zoom-image').first())
    await dismissZoom(page)
  }
}

function expectedAlerts(id: string) {
  if (!id.startsWith('on()/')) return []
  const event = id.split('/')[1]
  return [event === 'open only once' ? 'open' : event]
}
