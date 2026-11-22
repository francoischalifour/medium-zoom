/**
 * Runtime benchmark: the main-thread work that fixed workloads cost in Chromium, for the
 * compat and modern presets and the stock gallery, compared with
 * `baselines/bench.json`.
 *
 *   bun run bench                 Print every workload and fail when a count grows.
 *   bun run bench --markdown      Print the workloads that changed, for a pull request.
 *   bun run bench --update        Record the current counts as the baseline.
 *   bun run bench --grep gallery  Run the workloads whose name matches.
 *
 * Layout and style recalculation counts follow from what the code does, so they are
 * compared. Durations and frame times follow from the machine, so they are only
 * reported. Each workload runs in a fresh page several times; the median counts.
 * Run `bun run build` first.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { type CDPSession, chromium, devices, type Page } from '@playwright/test'

import { baselineSource, markdownTable, table } from './size-report'

const baselinePath = 'baselines/bench.json'
const updating = process.argv.includes('--update')
const markdown = process.argv.includes('--markdown')
const grep = process.argv.includes('--grep')
  ? new RegExp(process.argv[process.argv.indexOf('--grep') + 1]!, 'i')
  : undefined
const runs = 5
/** Counts may grow this much before the benchmark fails, for frames a slow run adds. */
const tolerance = (count: number) => Math.max(2, Math.ceil(count * 0.1))

type Counts = { layouts: number; styles: number }
type Measure = Counts & {
  scriptMs: number
  renderMs: number
  longFrames: number
}
const baseline: Record<string, Counts> = existsSync(baselinePath)
  ? JSON.parse(readFileSync(baselinePath, 'utf8'))
  : {}

const images = Array.from({ length: 24 }, (_, index) => {
  const number = (index % 7) + 1
  // Distinct URLs, so stepping loads each high-resolution image once.
  return `<img src="/images/image-${number}.thumbnail.jpg?${index}" data-zoom-src="/images/image-${number}.jpg?${index}" alt="Image ${index + 1}" width="300" height="200">`
}).join('\n')
const pages: Record<string, string> = {
  compat: `<script src="/dist/medium-zoom.min.js"></script>
    <script>window.benchZoom = mediumZoom('img')</script>`,
  modern: `<script type="module">
    import mediumZoom from '/dist/modern/index.mjs'
    window.benchZoom = mediumZoom('img')
  </script>`,
  gallery: `<link rel="stylesheet" href="/dist/gallery.css">
  <script type="module">
    import { createZoom } from '/dist/core/index.mjs'
    import { createGallery, galleryControls } from '/dist/gallery/index.mjs'
    import { loadHdImage } from '/dist/loaders/index.mjs'
    import { dialog } from '/dist/renderers/index.mjs'
    import { slide } from '/dist/transitions/index.mjs'
    import { bindZoomTriggers } from '/dist/triggers/index.mjs'
    window.benchZoom = createZoom('img', {
      loader: loadHdImage,
      margin: matchMedia('(max-width: 600px)').matches ? 0 : 24,
      renderer: dialog({ content: galleryControls(), transition: slide() }),
    })
    window.benchGallery = createGallery(window.benchZoom)
    bindZoomTriggers(window.benchZoom)
  </script>`,
}
const roots: Record<string, string> = {
  dist: resolve('dist'),
  images: resolve('stories/images'),
}
const server = Bun.serve({
  port: 0,
  hostname: '127.0.0.1',
  fetch(request) {
    const { pathname } = new URL(request.url)
    const name = pathname.slice(1, -'.html'.length)
    if (pages[name]) {
      return new Response(
        `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title><style>body{margin:24px;display:grid;gap:16px}img{max-width:100%;height:auto}</style>${images}${pages[name]}`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }
    const [, root, ...rest] = pathname.split('/')
    const directory = roots[root!]
    const path = directory && resolve(directory, ...rest)
    return path?.startsWith(directory) && existsSync(path)
      ? new Response(Bun.file(path))
      : new Response(null, { status: 404 })
  },
})

type Point = readonly [number, number]
interface Workload {
  name: string
  page: string
  phone?: boolean
  /** Chrome's "low-end mobile" slows the CPU six times. */
  throttle?: number
  run(page: Page, client: CDPSession): Promise<void>
}
const frames = (page: Page, count = 2) =>
  page.evaluate(
    count =>
      new Promise<void>(resolve => {
        const next = () => (count-- ? requestAnimationFrame(next) : resolve())
        next()
      }),
    count
  )
const openAndClose = (page: string): Workload => ({
  name: `${page}: open and close ×5`,
  page,
  async run(page) {
    for (let index = 0; index < 5; index++) {
      await page.evaluate(() => window.benchZoom.open())
      await page.evaluate(() => window.benchZoom.close())
    }
  },
})
const allWorkloads: Workload[] = [
  openAndClose('compat'),
  openAndClose('modern'),
  openAndClose('gallery'),
  {
    name: 'gallery: attach 2,000 images with triggers bound',
    page: 'gallery',
    async run(page) {
      await page.evaluate(() => {
        const batch = document.createDocumentFragment()
        for (let index = 0; index < 2_000; index++) {
          batch.appendChild(document.createElement('img'))
        }
        const images = batch.querySelectorAll('img')
        document.body.appendChild(batch)
        window.benchZoom.attach(images)
      })
      await frames(page)
    },
  },
  {
    // The presets close on resize, as in v1; composed zooms refit.
    name: 'gallery: resize ×30 while open',
    page: 'gallery',
    async run(page, client) {
      await page.evaluate(() => window.benchZoom.open())
      for (let index = 0; index < 30; index++) {
        await client.send('Emulation.setDeviceMetricsOverride', {
          width: 1_280 - index * 8,
          height: 720,
          deviceScaleFactor: 1,
          mobile: false,
        })
        await frames(page)
      }
      await page.evaluate(() => window.benchZoom.close())
    },
  },
  {
    name: 'gallery: step through 20 images',
    page: 'gallery',
    async run(page) {
      await page.evaluate(() => window.benchZoom.open())
      for (let index = 0; index < 20; index++) {
        await page.evaluate(() => window.benchGallery.next())
      }
      await page.evaluate(() => window.benchZoom.close())
    },
  },
  {
    name: 'gallery: swipes, a drag and pinches on a slow phone',
    page: 'gallery',
    phone: true,
    throttle: 6,
    async run(page, client) {
      const touch = (
        type: 'touchStart' | 'touchMove' | 'touchEnd',
        points: readonly Point[]
      ) =>
        client.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: points.map(([x, y], id) => ({ x, y, id })),
        })
      /** `spread` moves the fingers apart as they travel, for a pinch. */
      const gesture = async (
        from: Point[],
        dx: number,
        dy: number,
        spread = 0
      ) => {
        await touch('touchStart', from)
        for (let step = 1; step <= 12; step++) {
          const progress = step / 12
          await touch(
            'touchMove',
            from.map(([x, y], index) => [
              x + dx * progress + (index ? spread : -spread) * progress,
              y + dy * progress,
            ])
          )
          await frames(page, 1)
        }
        await touch('touchEnd', [])
        await frames(page, 30)
      }
      await page.evaluate(() => window.benchZoom.open())
      for (let swipe = 0; swipe < 4; swipe++) {
        await gesture([[300, 400]], -240, 0)
      }
      // Less than the distance that closes, so the image springs back.
      await gesture([[200, 300]], 0, 120)
      const fingers: Point[] = [
        [160, 400],
        [230, 400],
      ]
      await gesture(fingers, 0, 0, 80)
      await gesture(fingers, 0, 0, -60)
    },
  },
]
const workloads = allWorkloads.filter(({ name }) => !grep || grep.test(name))

declare global {
  interface Window {
    benchZoom: {
      open(): Promise<unknown>
      close(): Promise<unknown>
      attach(images: NodeListOf<HTMLImageElement>): void
    }
    benchGallery: { next(): Promise<unknown> }
    frameTimes: number[]
  }
}

// As config/playwright-chromium.mts: a matching browser when the preinstalled one is not.
const browser = await chromium.launch({
  executablePath: process.env.MEDIUM_ZOOM_CHROMIUM_PATH,
})
async function measure(workload: Workload): Promise<Measure> {
  const context = await browser.newContext(
    workload.phone
      ? devices['iPhone 13']
      : { viewport: { width: 1_280, height: 720 } }
  )
  const page = await context.newPage()
  const client = await context.newCDPSession(page)
  try {
    await page.goto(`${server.url}${workload.page}.html`)
    await page.waitForFunction(() => window.benchZoom)
    await page.evaluate(() =>
      Promise.all([...document.images].map(image => image.decode()))
    )
    await page.evaluate(() => {
      window.frameTimes = []
      let last = performance.now()
      const tick = (now: number) => {
        window.frameTimes.push(now - last)
        last = now
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    await client.send('Performance.enable')
    if (workload.throttle) {
      await client.send('Emulation.setCPUThrottlingRate', {
        rate: workload.throttle,
      })
    }
    const metrics = async () =>
      Object.fromEntries(
        (await client.send('Performance.getMetrics')).metrics.map(
          ({ name, value }) => [name, value]
        )
      )
    const before = await metrics()
    await workload.run(page, client)
    const after = await metrics()
    const delta = (name: string) => after[name]! - before[name]!
    const frameTimes = await page.evaluate(() => window.frameTimes.slice(1))
    return {
      layouts: delta('LayoutCount'),
      styles: delta('RecalcStyleCount'),
      scriptMs: delta('ScriptDuration') * 1_000,
      renderMs:
        (delta('LayoutDuration') + delta('RecalcStyleDuration')) * 1_000,
      longFrames: frameTimes.filter(time => time > 33.4).length,
    }
  } finally {
    await context.close()
  }
}

const median = (values: number[]) =>
  values.sort((a, b) => a - b)[Math.floor(values.length / 2)]!
const results: Record<string, Measure> = {}
try {
  for (const workload of workloads) {
    const samples: Measure[] = []
    for (let run = 0; run < runs; run++) {
      samples.push(await measure(workload))
    }
    results[workload.name] = Object.fromEntries(
      (Object.keys(samples[0]!) as (keyof Measure)[]).map(key => [
        key,
        median(samples.map(sample => sample[key])),
      ])
    ) as Measure
  }
} finally {
  await browser.close()
  await server.stop()
}

const ms = (value: number) => `${value.toFixed(0)} ms`
const delta = (now: number, before: number | undefined) =>
  before === undefined
    ? 'new'
    : now === before
      ? '—'
      : `${now > before ? '+' : '−'}${Math.abs(now - before)}`
const grown = Object.entries(results).filter(([name, { layouts, styles }]) => {
  const before = baseline[name]
  return (
    before &&
    (layouts > before.layouts + tolerance(before.layouts) ||
      styles > before.styles + tolerance(before.styles))
  )
})

if (updating) {
  const next = Object.fromEntries(
    Object.entries({ ...baseline, ...results }).map(
      ([name, { layouts, styles }]) => [name, { layouts, styles }]
    )
  )
  writeFileSync(baselinePath, `${JSON.stringify(next, null, 2)}\n`)
  console.log(
    `Recorded ${Object.keys(results).length} workloads in ${baselinePath}. Commit it with the change.`
  )
} else if (markdown) {
  const rows = Object.entries(results).flatMap(([name, now]) => {
    const before = baseline[name]
    return before &&
      now.layouts === before.layouts &&
      now.styles === before.styles
      ? []
      : [
          [
            name,
            `${before?.layouts ?? '—'} → ${now.layouts}`,
            `${before?.styles ?? '—'} → ${now.styles}`,
          ],
        ]
  })
  console.log(
    `Chromium, median of ${runs} runs, compared with \`${baselineSource(baselinePath)}\`.\n`
  )
  if (rows.length) {
    markdownTable(['Workload', 'Layouts', 'Style recalculations'], rows)
  } else {
    console.log('No change in layouts or style recalculations.')
  }
} else {
  console.log(
    `medium-zoom runtime · Chromium, median of ${runs} runs · compared with ${baselineSource(baselinePath)}\n`
  )
  table(
    [
      'Workload',
      'Layouts',
      'Change',
      'Styles',
      'Change',
      'Script',
      'Layout + style',
      'Frames > 33 ms',
    ],
    Object.entries(results).map(([name, now]) => {
      const before = baseline[name]
      return [
        name,
        String(now.layouts),
        delta(now.layouts, before?.layouts),
        String(now.styles),
        delta(now.styles, before?.styles),
        ms(now.scriptMs),
        ms(now.renderMs),
        String(now.longFrames),
      ]
    })
  )
  assert.equal(
    grown.length,
    0,
    `More layout or style work: ${grown.map(([name]) => name).join(', ')}. Find the cause, or record it with \`bun run bench --update\` and say why in the pull request.`
  )
  console.log(
    `\nLayout and style counts within ${baselinePath} and its tolerance; times are this machine's.`
  )
}
