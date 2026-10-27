import { test, expect, type Page, type BrowserContext } from '@playwright/test'

import { testUrl } from '../server-urls.ts'

const origin = 'https://medium-zoom.francoischalifour.com'
type Event = {
  event: string
  distinct_id: string
  anonymous_id: string | null
  properties: Record<string, unknown>
}

async function intercept(page: Page) {
  const events: Event[] = []
  await page.context().route('https://api.altertable.ai/**', async route => {
    if (route.request().method() === 'POST') {
      expect(new URL(route.request().url()).searchParams.get('apiKey')).toBe('website-test-key')
      events.push(...route.request().postDataJSON())
    }
    await route.fulfill({
      json: { ok: true },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  })
  await page.route(`${origin}/**`, async route => {
    const url = new URL(route.request().url())
    const response = await page.request.get(`${testUrl}/analytics${url.pathname}${url.search}`)
    await route.fulfill({ response })
  })
  return events
}

async function clipboardPermission(
  context: BrowserContext,
  page: Page,
  setting: 'granted' | 'denied'
) {
  await page.bringToFront()
  if (setting === 'granted') {
    await context.grantPermissions(['clipboard-write'], { origin })
    return
  }
  const session = await context.newCDPSession(page)
  const { targetInfo } = await session.send('Target.getTargetInfo')
  await session.send('Browser.setPermission', {
    permission: { name: 'clipboard-write' },
    setting,
    origin,
    browserContextId: targetInfo.browserContextId,
  })
  await session.detach()
}

for (const path of ['/', '/react']) {
  test(`${path} records successful interactions once with shared context`, async ({
    page,
    context,
  }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const events = await intercept(page)
    await page.goto(`${origin}${path}`)
    await expect.poll(() => events.filter(event => event.event === '$pageview').length).toBe(1)
    const first = events[0]
    expect(first.distinct_id).toBeTruthy()
    expect(first.anonymous_id).toBeNull()
    await clipboardPermission(context, page, 'granted')
    await page
      .locator('.hero-install')
      .getByRole('radio', { name: 'pnpm', exact: true })
      .press('Space')
    await page
      .locator('.hero-install')
      .getByRole('button', { name: 'Copy install command', exact: true })
      .click()
    await expect
      .poll(() => events.filter(event => event.event === 'Install Command Copied').length)
      .toBe(1)
    expect(
      events.find(event => event.event === 'Install Command Copied')!.properties.package_manager
    ).toBe('pnpm')

    const image = page
      .getByRole('region', { name: 'Image zoom examples', exact: true })
      .getByRole('button', { name: 'Zoom image: Ocean sunset', exact: true })
    await image.click()
    await expect.poll(() => events.filter(event => event.event === 'Image Zoomed').length).toBe(1)
    expect(events.find(event => event.event === 'Image Zoomed')!.properties).toMatchObject({
      image: 'landscape',
      rail: 'primary',
    })
    await page.keyboard.press('Escape')
    await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
    await page
      .getByRole('region', { name: 'Image zoom examples', exact: true })
      .getByRole('button', { name: 'Next example', exact: true })
      .click()
    await page
      .getByRole('article', { name: 'Mountains example', exact: true })
      .getByRole('tab', { name: 'Code', exact: true })
      .click()
    await page.getByRole('button', { name: 'Copy denali code', exact: true }).click()
    await expect.poll(() => events.filter(event => event.event === 'Code Copied').length).toBe(1)
    expect(events.find(event => event.event === 'Code Copied')!.properties).toMatchObject({
      snippet: 'example',
      example: 'denali',
      rail: 'primary',
    })

    await clipboardPermission(context, page, 'denied')
    await page.getByRole('button', { name: 'Copy usage code', exact: true }).click()
    await expect(
      page.getByRole('status').filter({ hasText: 'Select the text to copy.' })
    ).toBeVisible()
    await clipboardPermission(context, page, 'granted')
    await page.getByRole('button', { name: 'Copy usage code', exact: true }).click()
    await expect.poll(() => events.filter(event => event.event === 'Code Copied').length).toBe(2)

    // An in-page anchor is not another pageview.
    await page.getByRole('link', { name: 'Start building', exact: true }).click()
    await page.route('https://github.com/**', route =>
      route.fulfill({ body: '<title>External destination</title>' })
    )
    await page
      .getByRole('navigation')
      .getByRole('link', { name: /^GitHub repository/ })
      .click()
    await expect.poll(() => events.filter(event => event.event === 'Outbound Click').length).toBe(1)
    expect(events.find(event => event.event === 'Outbound Click')!.properties).toMatchObject({
      destination: 'https://github.com/francoischalifour/medium-zoom',
      placement: 'header',
    })
    expect(events.filter(event => event.event === '$pageview')).toHaveLength(1)
    for (const event of events) {
      expect(event.properties).toMatchObject({
        site: 'medium-zoom',
        page: path === '/' ? 'javascript' : 'react',
        path,
      })
      expect(event.distinct_id).toBe(first.distinct_id)
    }
    expect(errors).toEqual([])
  })
}

test('local and preview hosts never send events even with a configured key', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => {
    if (request.url().includes('api.altertable.ai')) {
      requests.push(request.url())
    }
  })
  await page.context().route('https://api.altertable.ai/**', route => route.abort())
  await page.route(`${testUrl}/**`, async route => {
    const response = await page.request.get(
      `${testUrl}/analytics${new URL(route.request().url()).pathname}`
    )
    await route.fulfill({ response })
  })
  await page.goto('/')
  await page
    .getByRole('region', { name: 'Image zoom examples', exact: true })
    .getByRole('button', { name: 'Zoom image: Ocean sunset', exact: true })
    .click()
  await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
  await page.keyboard.press('Escape')
  await page.route('https://preview.example/**', async route => {
    const response = await page.request.get(
      `${testUrl}/analytics${new URL(route.request().url()).pathname}`
    )
    await route.fulfill({ response })
  })
  await page.goto('https://preview.example/react')
  await page
    .getByRole('region', { name: 'Image zoom examples', exact: true })
    .getByRole('button', { name: 'Zoom image: Ocean sunset', exact: true })
    .click()
  await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
  expect(requests).toEqual([])
})

test('analytics delivery failures do not break zoom or clipboard feedback', async ({
  page,
  context,
}) => {
  await intercept(page)
  await page.context().route('https://api.altertable.ai/**', route => route.abort())
  await page.goto(`${origin}/react`)
  await clipboardPermission(context, page, 'granted')
  await page
    .locator('.hero-install')
    .getByRole('button', { name: 'Copy install command', exact: true })
    .click()
  await expect(page.getByRole('status').filter({ hasText: 'Copied to clipboard' })).toBeVisible()
  await page
    .getByRole('region', { name: 'Image zoom examples', exact: true })
    .getByRole('button', { name: 'Zoom image: Ocean sunset', exact: true })
    .press('Enter')
  await expect(page.locator('body')).toHaveClass(/medium-zoom--opened/)
  await page.keyboard.press('Escape')
  await expect(page.locator('body')).not.toHaveClass(/medium-zoom--opened/)
})

test('an immediate outbound navigation delivers the click without waiting for idle initialization', async ({
  page,
}) => {
  const events = await intercept(page)
  await page.route('https://github.com/**', route =>
    route.fulfill({ body: '<title>External destination</title>' })
  )
  await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded' })
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /^GitHub repository/ })
    .click()
  await expect.poll(() => events.filter(event => event.event === 'Outbound Click').length).toBe(1)
  expect(events.find(event => event.event === 'Outbound Click')!.properties).toMatchObject({
    site: 'medium-zoom',
    page: 'javascript',
    placement: 'header',
  })
})

test('documentation pageviews retain the shared website context', async ({ page }) => {
  const events = await intercept(page)
  await page.goto(`${origin}/docs/react/`)
  await expect.poll(() => events.filter(event => event.event === '$pageview').length).toBe(1)
  expect(events.find(event => event.event === '$pageview')!.properties).toMatchObject({
    site: 'medium-zoom',
    page: 'docs',
    path: '/docs/react/',
  })
})

test('settled searches record query parameters without typing or dismissal pageviews', async ({
  page,
}) => {
  const events = await intercept(page)
  await page.goto(`${origin}/docs/javascript/`)
  await expect.poll(() => events.filter(event => event.event === '$pageview').length).toBe(1)
  await page.getByRole('button', { name: /Search docs/ }).click()
  const search = page.getByRole('combobox')
  await search.pressSequentially('margin', { delay: 30 })
  await expect.poll(() => events.filter(event => event.event === '$pageview').length).toBe(2)
  await search.fill('galleries')
  await expect.poll(() => events.filter(event => event.event === '$pageview').length).toBe(3)
  await page.keyboard.press('Escape')
  await expect.poll(() => new URL(page.url()).searchParams.has('q')).toBe(false)
  await page.evaluate(() => {
    location.hash = 'install-the-package'
  })
  await page.getByRole('button', { name: /Search docs/ }).click()
  await search.fill('margin')
  await expect.poll(() => events.filter(event => event.event === '$pageview').length).toBe(4)
  const pageviews = events.filter(event => event.event === '$pageview')
  expect(pageviews.map(event => event.properties.q)).toEqual([
    undefined,
    'margin',
    'galleries',
    'margin',
  ])
  for (const event of pageviews) {
    expect(event.properties).toMatchObject({
      site: 'medium-zoom',
      page: 'docs',
      path: '/docs/javascript/',
    })
    expect(event.distinct_id).toBe(pageviews[0].distinct_id)
  }
})

test('chat handoffs use the same outbound tracking as other external links', async ({
  page,
  context,
}) => {
  const events = await intercept(page)
  await context.route('https://chatgpt.com/**', route =>
    route.fulfill({ body: '<title>Chat</title>', contentType: 'text/html' })
  )
  await page.goto(`${origin}/docs/?q=margin`)
  const popupPromise = page.waitForEvent('popup')
  await page.getByRole('option', { name: /^Ask ChatGPT/ }).click()
  const popup = await popupPromise
  await expect.poll(() => events.filter(event => event.event === 'Outbound Click').length).toBe(1)
  expect(events.find(event => event.event === 'Outbound Click')!.properties.destination).toBe(
    'https://chatgpt.com/'
  )
  await popup.close()
})

test('palette install actions respect package selection and clipboard permission', async ({
  page,
  context,
}) => {
  const events = await intercept(page)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin })
  await page.goto(`${origin}/docs/react/`)
  await page.bringToFront()
  await page.getByRole('radio', { name: 'pnpm', exact: true }).check()
  await page.getByRole('button', { name: /Search docs/ }).click()
  await page.getByRole('combobox').fill('copy react')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'pnpm dlx shadcn@latest add https://medium-zoom.francoischalifour.com/r/image-zoom.json'
  )
  await expect
    .poll(() => events.filter(event => event.event === 'Install Command Copied').length)
    .toBe(1)
  await clipboardPermission(context, page, 'denied')
  await page.getByRole('button', { name: /Search docs/ }).click()
  await page.getByRole('combobox').fill('copy react')
  await page.getByRole('option', { name: /Copy React install command/ }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(events.filter(event => event.event === 'Install Command Copied')).toHaveLength(1)
})
