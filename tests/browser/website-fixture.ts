import { test as base, expect } from '@playwright/test'

import snapshot from '../../website/src/npm-downloads.json'

// npm is an external dependency; normal website journeys use its saved report.
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route('https://api.npmjs.org/downloads/**', route =>
      route.fulfill({
        json: {
          package: 'medium-zoom',
          downloads: snapshot.monthly,
          start: snapshot.start,
          end: snapshot.end,
        },
        headers: { 'Access-Control-Allow-Origin': '*' },
      })
    )
    await use(context)
  },
})
export { expect }
