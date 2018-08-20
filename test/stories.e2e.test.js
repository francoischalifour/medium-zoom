/* eslint-disable no-await-in-loop */

import puppeteer from 'puppeteer'
import { toMatchImageSnapshot } from 'jest-image-snapshot'

expect.extend({ toMatchImageSnapshot })

const STORYBOOK_ENDPOINT = 'http://localhost:9001'

const storybook = [
  {
    kind: 'attach()',
    stories: [
      { name: 'with string selector' },
      { name: 'with Node selector' },
      { name: 'with multiple selectors' },
    ],
  },
  {
    kind: 'attributes',
    stories: [
      { name: 'data-zoom-target' },
      { name: 'srcset' },
      { name: 'srcset and data-zoom-target' },
      { name: 'SVG' },
    ],
  },
  {
    kind: 'detach()',
    stories: [
      { name: 'with string selector' },
      { name: 'with Node selector' },
      { name: 'with multiple selectors' },
      { name: 'all' },
    ],
  },
  {
    kind: 'extend()',
    stories: [{ name: 'with margin' }],
  },
  {
    kind: 'options',
    stories: [
      { name: 'default' },
      { name: 'background (dark)' },
      { name: 'background (transparent)' },
      { name: 'margin' },
      { name: 'scrollOffset' },
      { name: 'container (DOM element)' },
      { name: 'container (coordinates object)' },
      { name: 'template (Dropbox Paper)' },
      { name: 'template (Facebook)' },
    ],
  },
]

let browser
let page

beforeAll(async () => {
  browser = await puppeteer.launch()
  page = await browser.newPage()

  await page.setViewport({ width: 1280, height: 720 })
})

afterAll(async () => {
  await browser.close()
})

storybook.forEach(category => {
  describe(category.kind, () => {
    category.stories.forEach(story => {
      test(story.name, async () => {
        const queryParams = {
          full: 1,
          addons: 0,
          stories: 0,
          selectedKind: encodeURI(category.kind),
          selectedStory: encodeURI(story.name),
        }

        const urlParams = Object.entries(queryParams)
          .map(param => param.join('='))
          .join('&')

        await page.goto(`${STORYBOOK_ENDPOINT}?${urlParams}`)

        const container = (await page.frames()).find(
          frame => frame.name() === 'storybook-preview-iframe'
        )

        const images = await container.$$('.medium-zoom-image')

        // eslint-disable-next-line no-restricted-syntax
        for (const [index, image] of images.entries()) {
          await image.click()
          await page.waitFor(300)

          const screenshot = await page.screenshot()

          expect(screenshot).toMatchImageSnapshot({
            customSnapshotIdentifier: [
              'story',
              category.kind,
              story.name.toLowerCase().replace(/\s/g, '-'),
              index + 1,
            ].join('-'),
          })
        }
      })
    })
  })
})
