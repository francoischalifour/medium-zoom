import { mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { chromium } from '@playwright/test'

import { docsOgImagePath } from '../website/build/docs-sharing.ts'
import { docsPages } from '../website/src/docs/pages.ts'

// Run after editing share-card copy or docs titles/descriptions.
// Commit the cards so production builds need no browser.
const publicDirectoryUrl = new URL('../website/public/', import.meta.url)
const fontBase64 = readFileSync(
  new URL(
    '../website/node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2',
    import.meta.url
  )
).toString('base64')
const brandMark = readFileSync(new URL('brand/mark.svg', publicDirectoryUrl), 'utf8')
const brandHeader = `<header>${brandMark}<span>medium-zoom</span></header>`
const sharedStyles = `
    @font-face { font-family: Geist; src: url(data:font/woff2;base64,${fontBase64}); font-weight: 100 900; }
    * { box-sizing: border-box; }
    body { margin: 0; width: 1200px; height: 630px; padding: 56px 64px; font-family: Geist, sans-serif; background: white; color: #18181b; }
    header { display: flex; align-items: center; gap: 16px; font-weight: 650; letter-spacing: -1px; }
`
const oceanSunsetBase64 = readFileSync(
  new URL('../assets/images/ocean-sunset.jpg', import.meta.url)
).toString('base64')
mkdirSync(new URL('og/', publicDirectoryUrl), { recursive: true })
const browser = await chromium.launch()
try {
  const page = await browser.newPage({
    viewport: { width: 1_200, height: 630 },
    deviceScaleFactor: 1,
  })
  await page.setContent(`<!doctype html><html><head><style>
${sharedStyles}
    header { font-size: 28px; }
    header svg { width: 36px; height: 36px; }
    main { margin-top: 72px; }
    .group { color: #71717a; font-size: 24px; }
    h1 { margin: 18px 0 24px; font-size: 72px; font-weight: 600; line-height: 1.08; letter-spacing: -3px; }
    .description { margin: 0; max-width: 960px; color: #71717a; font-size: 28px; line-height: 1.45; }
    footer { position: absolute; left: 64px; right: 64px; bottom: 48px; border-top: 1px solid #e4e4e7; padding-top: 24px; display: flex; justify-content: space-between; font-size: 20px; color: #71717a; }
  </style></head><body>
    ${brandHeader}
    <main><div class="group"></div><h1></h1><p class="description"></p></main>
    <footer><span>Documentation</span><span>medium-zoom.francoischalifour.com</span></footer>
  </body></html>`)
  await page.evaluate(() => document.fonts.ready)
  for (const doc of docsPages) {
    await page.evaluate(doc => {
      document.querySelector('.group')!.textContent = doc.group
      document.querySelector('h1')!.textContent = doc.title
      document.querySelector('.description')!.textContent = doc.description
    }, doc)
    const fits = await page.evaluate(
      () =>
        document.querySelector('main')!.getBoundingClientRect().bottom <
        document.querySelector('footer')!.getBoundingClientRect().top
    )
    if (!fits) {
      throw new Error(`OG content overflows: ${doc.path}`)
    }
    await page.screenshot({
      path: fileURLToPath(new URL(`.${docsOgImagePath(doc.path)}`, publicDirectoryUrl)),
      type: 'jpeg',
      quality: 90,
    })
  }

  await page.setContent(`<!doctype html><html><head><style>
${sharedStyles}
    header { font-size: 30px; }
    header svg { width: 38px; height: 38px; }
    main { margin-top: 76px; width: 550px; }
    h1 { margin: 0; font-size: 80px; font-weight: 600; line-height: 1.06; letter-spacing: -4px; }
    h1 span { color: #71717a; }
    p { margin: 26px 0 0; font-size: 27px; line-height: 1.45; color: #71717a; }
    .cta { display: inline-flex; align-items: center; gap: 32px; margin-top: 34px; padding: 17px 23px; background: #18181b; color: white; border-radius: 12px; font-size: 24px; font-weight: 500; }
    .photo { position: absolute; right: 64px; top: 56px; width: 456px; height: 518px; border-radius: 16px; overflow: hidden; }
    .photo img { width: 100%; height: 100%; object-fit: cover; }
    .zoom { position: absolute; right: 22px; bottom: 22px; display: grid; place-items: center; width: 60px; height: 60px; border-radius: 50%; background: white; color: #18181b; box-shadow: 0 4px 16px #0003; }
    .zoom svg { width: 28px; height: 28px; }
  </style></head><body>
    ${brandHeader}
    <main>
      <h1>Image zoom<br /><span>for the web.</span></h1>
      <p>Lightweight JavaScript.<br />Zero dependencies. Any framework.</p>
      <div class="cta">Try the zoom <span>→</span></div>
    </main>
    <div class="photo">
      <img src="data:image/jpeg;base64,${oceanSunsetBase64}" alt="Ocean sunset" />
      <div class="zoom"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5M7.5 10.5h6m-3-3v6" /></svg></div>
    </div>
  </body></html>`)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map(image => image.decode()))
  })
  await page.screenshot({
    path: fileURLToPath(new URL('og-javascript.jpg', publicDirectoryUrl)),
    type: 'jpeg',
    quality: 90,
  })

  // GitHub repository settings use a 2:1 card, separate from the website OG cards.
  await page.setViewportSize({ width: 1_280, height: 640 })
  await page.setContent(`<!doctype html><html><head><style>
${sharedStyles}
    body { position: relative; width: 1280px; height: 640px; overflow: hidden; background: #111113; color: #f0f0f2; }
    header { font-size: 28px; letter-spacing: -1px; }
    header svg { width: 36px; height: 36px; }
    h1 { position: absolute; left: 64px; top: 202px; margin: 0; font-size: 84px; font-weight: 600; line-height: 1.04; letter-spacing: -4px; }
    .description { position: absolute; left: 66px; top: 414px; margin: 0; font-size: 25px; line-height: 1.4; letter-spacing: -0.5px; color: #a1a1aa; }
    .scene { position: absolute; left: 558px; top: 94px; width: 658px; height: 468px; perspective: 1100px; perspective-origin: 52% 44%; isolation: isolate; }
    .ambient { position: absolute; inset: -40px; background: radial-gradient(ellipse at 62% 40%, #aa6b7914, transparent 65%); }
    .ground-shadow { position: absolute; left: 158px; top: 372px; width: 440px; height: 70px; border-radius: 50%; background: #0008; transform: rotate(6deg); filter: blur(26px); }
    .page { position: absolute; z-index: 1; left: 0; top: 160px; width: 470px; height: 282px; padding: 24px; border: 1px solid #ffffff14; border-radius: 12px; background: linear-gradient(145deg, #242428, #17171a); transform: rotateX(22deg) rotateY(-24deg) rotateZ(-8deg); box-shadow: 0 18px 48px #0005; }
    .page-line { height: 6px; width: 134px; margin-bottom: 9px; border-radius: 4px; background: #ffffff1a; }
    .page-line.short { width: 88px; background: #ffffff0d; }
    .preview { position: absolute; left: 24px; top: 62px; width: 180px; height: 120px; border-radius: 5px; }
    .preview img { display: block; width: 100%; height: 100%; border-radius: inherit; opacity: 0.65; }
    .page-copy { position: absolute; left: 24px; top: 205px; }
    .page-copy .page-line { width: 184px; height: 5px; background: #ffffff0c; }
    .page-copy .short { width: 146px; }
    .cursor { position: absolute; left: 70px; top: 80px; width: 32px; height: 32px; color: white; filter: drop-shadow(0 2px 3px #0008); }
    .enlarged { position: absolute; z-index: 2; left: 150px; top: 24px; width: 490px; height: 330px; padding: 4px; border: 1px solid #ffffff45; border-radius: 12px; background: #232327; transform: rotateX(7deg) rotateY(-16deg) rotateZ(6deg); box-shadow: 1px 2px 0 #34343b, 0 34px 64px #0009; }
    .enlarged img { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 5px; }
    footer { position: absolute; left: 66px; bottom: 54px; font-size: 21px; letter-spacing: -0.4px; color: #a1a1aa; }
    footer strong { font-weight: 500; color: #f0f0f2; }
  </style></head><body>
    ${brandHeader}
    <h1>Bring images<br />closer.</h1>
    <p class="description">Add image zoom with<br />a few lines of JavaScript.</p>
    <div class="scene">
      <div class="ambient"></div>
      <div class="ground-shadow"></div>
      <div class="page">
        <div class="page-line"></div><div class="page-line short"></div>
        <div class="preview">
          <img src="data:image/jpeg;base64,${oceanSunsetBase64}" alt="Small ocean sunset embedded in a page" />
          <svg class="cursor" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="13" cy="13" r="8" fill="#111113" /><path d="m19 19 8 8M9.5 13h7m-3.5-3.5v7" /></svg>
        </div>
        <div class="page-copy"><div class="page-line"></div><div class="page-line short"></div></div>
      </div>
      <div class="enlarged"><img src="data:image/jpeg;base64,${oceanSunsetBase64}" alt="The same photo lifting out of the page toward the viewer" /></div>
    </div>
    <footer><strong>3 kB.</strong> No dependencies. Any framework.</footer>
  </body></html>`)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map(image => image.decode()))
  })
  await page.screenshot({
    path: fileURLToPath(new URL('../.github/social-preview.png', import.meta.url)),
    type: 'png',
  })
} finally {
  await browser.close()
}
