import { expect, type Page, test } from '@playwright/test'

import {
  addModernStyles,
  finishAnimations,
  openImage,
  preparePage,
} from './helpers'

const profiles = {
  compat: 'compat/index.mjs',
  compatPure: 'compat/pure/index.mjs',
  modern: 'modern/index.mjs',
  compatCjs: 'compat/index.cjs',
  compatPureCjs: 'compat/pure/index.cjs',
  modernCjs: 'modern/index.cjs',
  modernCoreCjs: 'core/index.cjs',
} as const

async function loadProfile(page: Page, file: string, withoutAssign = false) {
  await page.evaluate(
    async ({ file, withoutAssign }) => {
      const nativeAssign = Object.assign
      if (withoutAssign) {
        Object.defineProperty(Object, 'assign', {
          value: undefined,
          configurable: true,
        })
      }
      try {
        const url = `/${file === 'medium-zoom.esm.js' ? 'package' : 'experimental'}/dist/${file}`
        if (file.endsWith('.cjs')) {
          const loadCommonJS = async (url: string): Promise<unknown> => {
            const commonjs = { exports: {} as unknown }
            const source = await (await fetch(url)).text()
            // oxlint-disable-next-line typescript/no-implied-eval -- Execute our packed CJS artifact in its module scope.
            new Function('module', 'exports', source)(
              commonjs,
              commonjs.exports
            )
            return commonjs.exports
          }
          if (file === 'core/index.cjs') {
            const core = (await loadCommonJS(
              url
            )) as typeof import('../../src/zoom')
            window.mediumZoom = ((
              selector?: import('../../src/zoom/engine').ZoomSelector,
              options?: import('../../src/preset/medium-zoom').ZoomOptions
            ) =>
              core.createZoom(
                selector,
                options
              )) as unknown as typeof window.mediumZoom
          } else {
            window.mediumZoom = (await loadCommonJS(
              url
            )) as typeof window.mediumZoom
          }
        } else {
          window.mediumZoom = (await import(url)).default
        }
      } finally {
        Object.defineProperty(Object, 'assign', {
          value: nativeAssign,
          configurable: true,
        })
      }
    },
    { file, withoutAssign }
  )
  if (file === 'core/index.cjs') {
    await addModernStyles(page)
  }
}

for (const [profile, file] of Object.entries(profiles)) {
  if (profile.startsWith('compat')) {
    test(`${profile}: option copying works without native Object.assign`, async ({
      page,
    }) => {
      await preparePage(page)
      await loadProfile(page, file, true)
      const result = await page.evaluate(async () => {
        const options = Object.create({ inherited: true })
        options.container = { width: 600 }
        Object.defineProperty(options, 'margin', {
          value: 99,
          enumerable: false,
        })
        const zoom = window.mediumZoom('#image', options)
        zoom.update({ container: { top: 12 } })
        const clone = zoom.clone({ margin: 16 })
        await zoom.open()
        await zoom.close()
        return {
          options: zoom.getOptions(),
          cloned: clone.getOptions(),
          closed: zoom.getZoomedImage(),
        }
      })
      expect(result).toEqual({
        options: {
          margin: 0,
          background: '#fff',
          scrollOffset: 40,
          container: { width: 600, top: 12 },
          template: null,
        },
        cloned: {
          margin: 16,
          background: '#fff',
          scrollOffset: 40,
          container: { width: 600, top: 12 },
          template: null,
        },
        closed: null,
      })
    })
  }

  test(`${profile}: Promise compatibility stays isolated`, async ({ page }) => {
    await preparePage(page)
    await loadProfile(page, file)
    const result = await page.evaluate(() => {
      const mediumZoom = window.mediumZoom
      const native = window.Promise
      Object.defineProperty(window, 'Promise', {
        value: undefined,
        configurable: true,
      })
      try {
        const zoom = mediumZoom('#image')
        try {
          const opening = zoom.open()
          const closing = zoom.close()
          return {
            openingThen: typeof opening.then,
            closeThen: typeof closing.then,
            untouched: window.Promise === undefined,
          }
        } catch (error) {
          return {
            error: (error as Error).name,
            untouched: window.Promise === undefined,
          }
        }
      } finally {
        Object.defineProperty(window, 'Promise', {
          value: native,
          configurable: true,
        })
      }
    })
    expect(result).toEqual(
      !profile.startsWith('modern')
        ? { openingThen: 'undefined', closeThen: 'undefined', untouched: true }
        : { error: 'TypeError', untouched: true }
    )
  })

  test(`${profile}: CustomEvent compatibility stays isolated`, async ({
    page,
  }) => {
    await preparePage(page)
    await loadProfile(page, file)
    const result = await page.evaluate(() => {
      const mediumZoom = window.mediumZoom
      const zoom = mediumZoom('#image')
      const native = window.CustomEvent
      let observed = false
      zoom.on('update', event => {
        observed = (event as CustomEvent).detail.zoom === zoom
      })
      Object.defineProperty(window, 'CustomEvent', {
        value: undefined,
        configurable: true,
      })
      try {
        zoom.update({ margin: 12 })
        return { observed }
      } catch (error) {
        return { error: (error as Error).name }
      } finally {
        Object.defineProperty(window, 'CustomEvent', {
          value: native,
          configurable: true,
        })
      }
    })
    expect(result).toEqual(
      !profile.startsWith('modern')
        ? { observed: true }
        : { error: 'TypeError' }
    )
  })

  test(`${profile}: frozen update options retain strict-mode semantics`, async ({
    page,
  }) => {
    await preparePage(page)
    await loadProfile(page, file)
    const result = await page.evaluate(() => {
      const zoom = window.mediumZoom('#image')
      try {
        zoom.update(Object.freeze({ container: { top: 12 } }))
        return 'accepted'
      } catch (error) {
        return (error as Error).name
      }
    })
    expect(result).toBe(file === 'core/index.cjs' ? 'accepted' : 'TypeError')
  })

  for (const legacy of ['Esc', 'keyCode'] as const) {
    test(`${profile}: ${legacy} keyboard handling is profile-specific`, async ({
      page,
    }) => {
      await preparePage(page)
      await loadProfile(page, file)
      await page.evaluate(async () => {
        window.zoom = window.mediumZoom('#image')
        await window.zoom.open()
      })
      await page.evaluate(
        legacy =>
          document.dispatchEvent(
            new KeyboardEvent(
              'keyup',
              legacy === 'Esc' ? { key: 'Esc' } : { keyCode: 27 }
            )
          ),
        legacy
      )
      await expect(page.locator('.medium-zoom-overlay')).toHaveCount(
        !profile.startsWith('modern') ? 0 : 1
      )
      if (profile.startsWith('modern')) {
        await page.keyboard.press('Escape')
        await expect(page.locator('.medium-zoom-overlay')).toHaveCount(0)
      }
    })
  }
}

test('modern rendering matches compat and the v1 default', async ({ page }) => {
  const screenshots = []
  for (const file of [
    'medium-zoom.esm.js',
    ...Object.values(profiles).filter(file => file !== 'core/index.cjs'),
  ]) {
    await preparePage(page, {
      body: `<img id="image" src="/images/image-1.jpg" data-zoom-src="/images/image-2.jpg" width="160" alt="Zoom fixture"><template id="template"><div>Caption</div></template>`,
    })
    await loadProfile(page, file)
    await page.evaluate(() => {
      window.zoom = window.mediumZoom('#image', {
        margin: 24,
        background: '#fafafa',
        template: '#template',
      })
    })
    if (file.includes('/pure/')) {
      await page.addStyleTag({ url: '/package/dist/style.css' })
    }
    await openImage(page, page.locator('#image'))
    await finishAnimations(page)
    screenshots.push(await page.screenshot())
    await page.evaluate(() => window.zoom.close())
  }
  for (const screenshot of screenshots.slice(1)) {
    expect(screenshot.equals(screenshots[0]!)).toBe(true)
  }
})
