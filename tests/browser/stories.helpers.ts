import { expect, type Page, type TestInfo } from '@playwright/test'

export interface StoryLink {
  id: string
  url: string
}

export async function observeStoryEvents(page: Page) {
  await page.addInitScript(() => {
    window.storyEvents = []
    for (const type of ['open', 'opened', 'close', 'closed']) {
      document.addEventListener(
        `medium-zoom:${type}`,
        event => {
          window.storyEvents.push({ type, target: (event.target as HTMLElement).id })
        },
        true
      )
    }
  })
}

export async function readStories(page: Page): Promise<StoryLink[]> {
  await page.goto('/storybook/')
  const links = page.locator('nav a')
  await expect(links.first()).toBeVisible()
  return links.evaluateAll(links =>
    links.map(link => {
      const url = (link as HTMLAnchorElement).href
      return { id: new URL(url).searchParams.get('story')!, url }
    })
  )
}

export async function captureStory(
  page: Page,
  testInfo: TestInfo,
  { story, index, state }: { story: StoryLink; index: number; state: 'before' | 'after' }
) {
  const slug = story.id.replace(/[^a-z0-9]+/gi, '-')
  const name = `${String(index + 1).padStart(2, '0')}-${slug}-${state}.png`
  const path = testInfo.outputPath(name)
  await page.screenshot({ path })
  if (state === 'after') {
    await testInfo.attach(story.id, { path, contentType: 'image/png' })
  }
  return name
}
