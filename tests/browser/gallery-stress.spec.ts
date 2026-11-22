import { expect, type Page, test, type TestInfo } from '@playwright/test'

import { fingers, inputFor, type Point } from './fingers'
import { addModernStyles, preparePage } from './helpers'

/*
  Seeded random gallery interactions, checked on every frame and at rest. A failure names
  its seed and actions: replay it with MEDIUM_ZOOM_STRESS_SEED=<seed>.
  `bun run test:stress` runs more and longer sequences.
*/

const seeds = process.env.MEDIUM_ZOOM_STRESS_SEED
  ? [Number(process.env.MEDIUM_ZOOM_STRESS_SEED)]
  : Array.from(
      { length: Number(process.env.MEDIUM_ZOOM_STRESS_SEEDS ?? 2) },
      (_, index) => index + 1
    )
const steps = Number(process.env.MEDIUM_ZOOM_STRESS_STEPS ?? 40)
const margin = 24

/**
 * Landscape, panorama and portrait shapes, one image without high-resolution media and
 * one whose full size is smaller than the window.
 */
const photos: [thumbnail: string, full?: string][] = [
  ['image-1.thumbnail.jpg', 'image-1.jpg'],
  ['image-3.thumbnail.jpg', 'image-3.jpg'],
  ['image-4.thumbnail.jpg', 'image-4.jpg'],
  ['image-2.thumbnail.jpg', 'image-2.jpg'],
  ['image-6.jpg'],
  ['image-5.thumbnail.jpg', 'image-5.jpg'],
  ['image-1.thumbnail.jpg', 'image-1x600.jpg'],
  ['image-7.thumbnail.jpg', 'image-7.jpg'],
]
const body = photos
  .map(
    ([thumbnail, full], index) =>
      `<img src="/images/${thumbnail}" ${full ? `data-zoom-src="/stress-hd/${index}/${full}"` : ''} width="150" alt="Photo ${index + 1}" style="margin:8px">`
  )
  .join('')

const generator = (seed: number) => {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d_2b_79_f5) >>> 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value)
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296
  }
  return {
    next,
    between: (low: number, high: number) => low + next() * (high - low),
    pick: <Item>(items: readonly Item[]) =>
      items[Math.floor(next() * items.length)]!,
  }
}

async function mount(page: Page, random: ReturnType<typeof generator>) {
  await preparePage(page, { body, bodyStyle: 'margin:32px;min-height:300vh' })
  await addModernStyles(page)
  // Full-size images arrive late, out of order, or never.
  await page.route('**/stress-hd/**', async route => {
    const delay = random.between(0, 900)
    const fails = random.next() < 0.1
    await new Promise(resolve => setTimeout(resolve, delay))
    if (fails) {
      await route.abort('failed')
    } else {
      const source = route.request().url().split('/').pop()!
      await route.fulfill({ path: `stories/images/${source}` })
    }
  })
  await page.evaluate(async margin => {
    const { createZoom } = await window.loadEntry('core')
    const { galleryControls } = await window.loadEntry('gallery')
    const { loadHdImage } = await window.loadEntry('loaders')
    const { dialog } = await window.loadEntry('renderers')
    const { slide } = await window.loadEntry('transitions')
    const { bindZoomTriggers } = await window.loadEntry('triggers')
    window.modalZoom = createZoom('img', {
      margin,
      loader: loadHdImage,
      renderer: dialog({ content: galleryControls(), transition: slide() }),
    })
    bindZoomTriggers(window.modalZoom)

    const state = window as unknown as { glitches: string[] }
    state.glitches = []
    const report = (glitch: string) => {
      if (state.glitches.length < 20) {
        state.glitches.push(glitch)
      }
    }
    // What last lost focus and the input before, to name the culprit if focus leaves the zoom.
    let blurred = ''
    const trail: string[] = []
    const name = (element: Element) =>
      `${element.tagName.toLowerCase()}.${element.className} ${element.getAttribute('aria-label') ?? element.getAttribute('alt') ?? ''}${element.isConnected ? '' : ' (removed)'}`
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'click']) {
      document.addEventListener(
        type,
        event => {
          trail.push(`${type} on ${name(event.target as Element)}`)
          trail.splice(0, trail.length - 6)
        },
        true
      )
    }
    document.addEventListener('focusout', event => {
      blurred = `${name(event.target as Element)} after ${trail.join(', ')}`
    })
    const watch = () => {
      const dialogs = document.querySelectorAll('dialog')
      if (dialogs.length > 1) {
        report(`${dialogs.length} dialogs`)
      }
      const open = dialogs[0]
      if (open && !open.contains(document.activeElement)) {
        report(`focus left the zoom from ${blurred}`)
      }
      if (open) {
        const images = open.querySelectorAll('img')
        // Each scene has a frame and its high-resolution copy, plus two swipe neighbours.
        if (images.length > 8) {
          report(`${images.length} images on stage`)
        }
        // Showing, not closing: something must be on screen, never the bare backdrop.
        if (document.body.classList.contains('medium-zoom--opened')) {
          // The page image stands in until its copy in the zoom can be painted.
          const current = window.modalZoom.getZoomedImage() as HTMLImageElement
          const candidates = current.classList.contains(
            'medium-zoom-image--hidden'
          )
            ? [...images]
            : [...images, current]
          const shown = candidates.some(image => {
            const style = getComputedStyle(image)
            const box = image.getBoundingClientRect()
            return (
              image.naturalWidth > 0 &&
              style.visibility === 'visible' &&
              Number(style.opacity) > 0 &&
              box.width > 1 &&
              box.right > 0 &&
              box.left < innerWidth &&
              box.bottom > 0 &&
              box.top < innerHeight
            )
          })
          if (!shown) {
            const seen = [...images].map(image => {
              const style = getComputedStyle(image)
              const box = image.getBoundingClientRect()
              return `${image.className || 'neighbour'} ${image.currentSrc.split('/').slice(-2).join('/')} complete=${image.complete}: ${image.naturalWidth}px wide, ${style.visibility}, opacity ${Number(style.opacity).toFixed(2)}, at ${Math.round(box.left)},${Math.round(box.top)} ${Math.round(box.width)}×${Math.round(box.height)}`
            })
            report(
              `no image on screen while open [${seen.join(' | ') || 'none'}]`
            )
          }
        }
      }
      requestAnimationFrame(watch)
    }
    requestAnimationFrame(watch)
  }, margin)
}

/** Waits until nothing moves, then lists what is wrong with the resting state. */
async function settle(page: Page) {
  const resting = await page
    .waitForFunction(
      () => {
        const open = document.querySelector('dialog')
        if (!open) {
          return !document.querySelector('.medium-zoom-overlay')
        }
        // Gestures spring with animation frames, not animations: wait until the frames
        // have held still for a few polls.
        const state = window as unknown as { pose?: string; still?: number }
        const pose = [...open.querySelectorAll('img')]
          .map(image => {
            const { left, top, width } = image.getBoundingClientRect()
            return `${Math.round(left)},${Math.round(top)},${Math.round(width)}`
          })
          .join(' ')
        state.still = pose === state.pose ? (state.still ?? 0) + 1 : 0
        state.pose = pose
        return (
          state.still >= 5 &&
          !open.hasAttribute('aria-busy') &&
          !open.hasAttribute('data-medium-zoom-gesture') &&
          !open.querySelector(
            '.medium-zoom-image--leaving, img:not([class])'
          ) &&
          [...open.querySelectorAll('*')].every(
            element => !element.getAnimations().length
          )
        )
      },
      undefined,
      { timeout: 4_000, polling: 'raf' }
    )
    .then(
      () => true,
      () => false
    )
  return page.evaluate(
    ({ resting, margin }) => {
      const open = document.querySelector('dialog')
      const moving = open
        ? [
            open.getAttribute('aria-busy') && 'busy',
            open.getAttribute('data-medium-zoom-gesture') &&
              `gesture ${open.getAttribute('data-medium-zoom-gesture')}`,
            open.querySelector('.medium-zoom-image--leaving') &&
              'a frame leaving',
            open.querySelector('img:not([class])') && 'swipe neighbours shown',
            ...[...open.querySelectorAll('*')].flatMap(element =>
              element
                .getAnimations()
                .map(
                  animation =>
                    `${(animation as CSSTransition).transitionProperty ?? 'animation'} on ${element.tagName.toLowerCase()} (${animation.playState})`
                )
            ),
          ].filter(Boolean)
        : ['overlay left behind']
      const problems: string[] = resting
        ? []
        : [`never came to rest: ${moving.join(', ') || 'frames kept moving'}`]
      const zoom = window.modalZoom
      const images = zoom.getImages()
      const current = zoom.getZoomedImage()
      const hidden = images.filter(image =>
        image.classList.contains('medium-zoom-image--hidden')
      )
      if (!open) {
        if (current) {
          problems.push(`closed with ${current.getAttribute('alt')} current`)
        }
        if (hidden.length) {
          problems.push(`${hidden.length} page images left hidden`)
        }
        if (document.body.classList.contains('medium-zoom--opened')) {
          problems.push('body still marked open')
        }
        if (document.documentElement.scrollWidth > innerWidth + 1) {
          problems.push('page scrolls sideways')
        }
        return problems
      }
      if (!current) {
        return [...problems, 'open without a current image']
      }
      const index = images.indexOf(current)
      const alt = current.getAttribute('alt')
      if (open.getAttribute('aria-label') !== alt) {
        problems.push(
          `labelled ${open.getAttribute('aria-label')}, shows ${alt}`
        )
      }
      if (hidden.length !== 1 || hidden[0] !== current) {
        problems.push(`${hidden.length} page images hidden`)
      }
      const position = open
        .querySelector('.medium-zoom-position span')
        ?.textContent?.trim()
      if (position !== `${index + 1} / ${images.length}`) {
        problems.push(`counter reads ${position} on image ${index + 1}`)
      }
      const disabled = (name: string) =>
        open
          .querySelector(`.medium-zoom-control--${name}`)
          ?.getAttribute('aria-disabled') === 'true'
      if (disabled('previous') !== (index === 0)) {
        problems.push(`previous button wrong on image ${index + 1}`)
      }
      if (disabled('next') !== (index === images.length - 1)) {
        problems.push(`next button wrong on image ${index + 1}`)
      }
      const accessible = open.querySelectorAll('img:not([aria-hidden="true"])')
      if (accessible.length !== 1) {
        problems.push(`${accessible.length} accessible images`)
      }
      const frames = [
        ...open.querySelectorAll<HTMLImageElement>(
          '.medium-zoom-image--opened'
        ),
      ]
      if (!frames.length || frames.length > 2) {
        problems.push(`${frames.length} frames`)
      }
      if (!open.contains(document.activeElement)) {
        problems.push(`focus on ${document.activeElement?.tagName}`)
      }
      if (!open.hasAttribute('data-medium-zoom-zoomed') && frames.length) {
        const stage = open.getBoundingClientRect()
        const boxes = frames.map(frame => frame.getBoundingClientRect())
        const [box] = boxes
        const width = stage.width - margin * 2
        const height = stage.height - margin * 2
        const left = box!.left - stage.left
        const top = box!.top - stage.top
        // An image smaller than the window is shown at its own size, never enlarged.
        const media = frames[frames.length - 1]!
        const natural =
          Math.abs(box!.width - media.naturalWidth) <= 2 &&
          Math.abs(box!.height - media.naturalHeight) <= 2
        if (
          box!.width > width + 1 ||
          box!.height > height + 1 ||
          (Math.abs(box!.width - width) > 2 &&
            Math.abs(box!.height - height) > 2 &&
            !natural)
        ) {
          problems.push(
            `frame ${Math.round(box!.width)}×${Math.round(box!.height)} not fitted to ${width}×${height} (${frames.map(frame => `${frame.style.transform} | ${frame.style.translate} | ${frame.style.scale}`).join(' ; ')}; ${[...open.attributes].map(attribute => attribute.name).join(' ')})`
          )
        }
        // Centred in the stage, or in the window for an image that entered after the stage
        // started following the page's scroll.
        const centred = (x: number, y: number, width: number, height: number) =>
          Math.abs(x - (width - box!.width) / 2) <= 2 &&
          Math.abs(y - (height - box!.height) / 2) <= 2
        if (
          !centred(left, top, stage.width, stage.height) &&
          !centred(
            box!.left,
            box!.top,
            document.documentElement.clientWidth,
            document.documentElement.clientHeight
          )
        ) {
          problems.push(
            `frame ${Math.round(box!.width)}×${Math.round(box!.height)} off centre at ${Math.round(left)},${Math.round(top)} in ${Math.round(stage.width)}×${Math.round(stage.height)} (${frames.map(frame => `${frame.style.translate} | ${frame.style.scale}`).join(' ; ')})`
          )
        }
        if (
          boxes.some(
            other =>
              Math.abs(other.left - box!.left) > 1 ||
              Math.abs(other.width - box!.width) > 1
          )
        ) {
          problems.push('frame and its copy disagree')
        }
      }
      return problems
    },
    { resting, margin }
  )
}

type Action = [name: string, run: () => Promise<unknown>]

function actions(
  page: Page,
  info: TestInfo,
  random: ReturnType<typeof generator>
) {
  const mobile = !!info.project.use.isMobile
  const finger = fingers(page, inputFor(info))
  const pair = fingers(page, inputFor(info, 2))
  const wait = (high = 400) => page.waitForTimeout(random.between(0, high))
  const centre = async (): Promise<Point> => {
    const box = await page
      .locator(
        'dialog img.medium-zoom-image--opened:not(.medium-zoom-image--leaving)'
      )
      .last()
      .boundingBox({ timeout: 500 })
      .catch(() => null)
    const size = page.viewportSize()!
    // The image's centre, kept inside the window where a finger can reach it.
    const inside = (value: number, limit: number) =>
      Math.min(Math.max(value, 16), limit - 16)
    return box
      ? [
          inside(box.x + box.width / 2, size.width),
          inside(box.y + box.height / 2, size.height),
        ]
      : [size.width / 2, size.height / 2]
  }
  // Released inside the window: browsers do not report a mouse released outside it.
  const swipe = async (dx: number, dy = 0) => {
    const [x, y] = await centre()
    const { width, height } = page.viewportSize()!
    const inside = (from: number, by: number, size: number) =>
      Math.min(Math.max(from + by, 8), size - 8) - from
    const input = await finger
    await input.down([x, y])
    await input.glide(
      inside(x, dx, width),
      inside(y, dy, height),
      Math.round(random.between(2, 8))
    )
    await input.up()
  }
  const button = (name: string) =>
    page
      .getByRole('button', { name })
      .click({ force: true, timeout: 1_000 })
      .catch(() => {})
  const key = (name: string) => page.keyboard.press(name)
  const hold = async (name: string) => {
    const until = Date.now() + random.between(150, 1_200)
    while (Date.now() < until) {
      await page.keyboard.down(name)
      await page.waitForTimeout(33)
    }
    await page.keyboard.up(name)
  }

  const whenClosed: Action[] = [
    [
      'open an image',
      async () => {
        const image = page
          .locator('body > img')
          .nth(Math.floor(random.next() * photos.length))
        await image.scrollIntoViewIfNeeded()
        await image.click({ timeout: 1_000 }).catch(() => {})
      },
    ],
    [
      'open with the keyboard',
      async () => {
        const image = page
          .locator('body > img')
          .nth(Math.floor(random.next() * photos.length))
        await image.scrollIntoViewIfNeeded()
        await image.focus()
        await key('Enter')
      },
    ],
  ]
  const whenOpen: [weight: number, ...Action][] = [
    [6, 'next button', () => button('Next image')],
    [4, 'previous button', () => button('Previous image')],
    [5, 'arrow right', () => key('ArrowRight')],
    [3, 'arrow left', () => key('ArrowLeft')],
    [1, 'Home', () => key('Home')],
    [1, 'End', () => key('End')],
    [3, 'hold arrow right', () => hold('ArrowRight')],
    [2, 'hold arrow left', () => hold('ArrowLeft')],
    [5, 'swipe left', () => swipe(-random.between(40, 320))],
    [3, 'swipe right', () => swipe(random.between(40, 320))],
    [
      3,
      'swipe twice in a row',
      async () => {
        const dx = random.next() < 0.7 ? -150 : 150
        await swipe(dx)
        await wait(120)
        await swipe(dx)
      },
    ],
    [
      2,
      'drag down',
      () => swipe(random.between(-30, 30), random.between(40, 260)),
    ],
    [
      2,
      'tap the image',
      async () => {
        const [x, y] = await centre()
        await page.mouse.click(x, y)
      },
    ],
    [
      2,
      'double tap the image',
      async () => {
        const [x, y] = await centre()
        await page.mouse.click(x, y)
        await page.waitForTimeout(80)
        await page.mouse.click(x, y)
      },
    ],
    [2, 'zoom in', () => key('+')],
    [1, 'zoom out', () => key('-')],
    [1, 'zoom to fit', () => key('0')],
    [
      2,
      'pan',
      () => swipe(random.between(-200, 200), random.between(-200, 200)),
    ],
    // Desktop browsers pinch with the trackpad, as Ctrl+wheel: two touch points are phones'.
    [
      mobile ? 2 : 0,
      'pinch',
      async () => {
        const [x, y] = await centre()
        const input = await pair
        await input.down([x - 30, y], [x + 30, y])
        await input.glide(0, 0, 6, random.between(-25, 80))
        await input.up()
      },
    ],
    [
      mobile ? 0 : 2,
      'ctrl wheel',
      async () => {
        const [x, y] = await centre()
        await page.mouse.move(x, y)
        await page.keyboard.down('Control')
        await page.mouse.wheel(0, random.between(-300, 300))
        await page.keyboard.up('Control')
      },
    ],
    [
      1,
      'scroll the page',
      () =>
        page.evaluate(
          dy => scrollBy(0, dy),
          Math.round(random.between(-30, 90))
        ),
    ],
    [1, 'Escape', () => key('Escape')],
    [
      1,
      'click the backdrop',
      async () => {
        const size = page.viewportSize()!
        await page.mouse.click(4, size.height - 4)
      },
    ],
    [
      1,
      'resize the window',
      async () => {
        const size = page.viewportSize()!
        await page.setViewportSize({
          width: Math.round(size.width + random.between(-40, 40)),
          height: Math.round(size.height + random.between(-40, 40)),
        })
      },
    ],
  ]
  const total = whenOpen.reduce((sum, [weight]) => sum + weight, 0)
  return {
    wait,
    choose: (open: boolean): Action => {
      if (!open) {
        return random.pick(whenClosed)
      }
      let roll = random.next() * total
      for (const [weight, ...action] of whenOpen) {
        roll -= weight
        if (roll < 0) {
          return action
        }
      }
      return whenOpen[0]!.slice(1) as Action
    },
  }
}

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  for (const seed of reducedMotion === 'reduce' ? seeds.slice(0, 1) : seeds) {
    test(`interactions stay consistent under stress (seed ${seed}, motion ${reducedMotion})`, async ({
      page,
    }, info) => {
      test.setTimeout(steps * 4_000)
      const errors: string[] = []
      page.on('pageerror', error => errors.push(String(error)))
      page.on('console', message => {
        // Aborted high-resolution loads are part of the test.
        if (
          message.type() === 'error' &&
          !message.text().includes('Failed to load resource')
        ) {
          errors.push(message.text())
        }
      })
      await page.emulateMedia({ reducedMotion })
      const random = generator(
        seed * 7_919 + (reducedMotion === 'reduce' ? 1 : 0)
      )
      await mount(page, random)
      const { choose, wait } = actions(page, info, random)
      const log: string[] = []
      const failure = (problems: string[]) =>
        `seed ${seed}: ${problems.join('; ')}\nafter: ${log.slice(-12).join(' → ')}`

      for (let step = 0; step < steps; step++) {
        const open = await page.locator('dialog').count()
        const [name, run] = choose(open > 0)
        log.push(name)
        await run()
        await wait()
        // Rest every few actions; act on moving state otherwise.
        if (random.next() < 0.3 || step === steps - 1) {
          const problems = await settle(page)
          expect(problems, failure(problems)).toEqual([])
        }
        const glitches = await page.evaluate(
          () => (window as unknown as { glitches: string[] }).glitches
        )
        expect(glitches, failure(glitches)).toEqual([])
        expect(errors, failure(errors)).toEqual([])
      }
      await page.keyboard.press('Escape')
      expect(await settle(page), failure(['closing'])).toEqual([])
      const image = page.locator('body > img').first()
      await image.scrollIntoViewIfNeeded()
      await image.click()
      await expect(page.getByRole('dialog', { name: 'Photo 1' })).toBeVisible()
      expect(await settle(page), failure(['reopening'])).toEqual([])
    })
  }
}
