import type { ZoomContent } from 'medium-zoom/core'

import { createGallery } from './index'
import { isGalleryKey, ownKeys } from './keyboard'

/** What `bindGalleryGestures()` works on: the view a `ZoomContent` receives. */
export type GalleryGestureView = Parameters<ZoomContent>[0]

/** Where the open image sits over its fitted place: screen = fitted × k + (x, y). */
type Placement = [x: number, y: number, k: number]
type Mode = '' | 'pending' | 'swipe' | 'close' | 'pan' | 'pinch'
// Frames and previews are media elements: images today, videos as well tomorrow.
type Media = HTMLElement & {
  naturalWidth?: number
  videoWidth?: number
  naturalHeight?: number
  videoHeight?: number
  currentSrc?: string
}

// Spring rates per millisecond: settling a gesture, and coasting after a pan.
const snappy = 0.022
const coast = 0.007
// Movement before a press becomes a drag, and the speed that makes a flick, in px/ms.
const slop = 8
const fling = 0.25
// The space between neighbouring images while swiping.
const gap = 16
// The longest pause between the presses of a double tap, and how far a single tap
// shrinks the image while it waits to tell.
const doubleTap = 300
const hint = 0.95
const rest: Placement = [0, 0, 1]

const clamp = (value: number, [min, max]: number[]) =>
  Math.min(Math.max(value, min!), max!)
/** Past its limits a value moves less the further it goes, as against an elastic band. */
const rubber = (value: number, limits: number[], size: number) => {
  const over = value - clamp(value, limits)
  return (
    value -
    over +
    Math.sign(over) * size * (1 - 1 / ((Math.abs(over) * 0.55) / size + 1))
  )
}
const mediaSize = (media: Media) => [
  media.naturalWidth || media.videoWidth || media.offsetWidth,
  media.naturalHeight || media.videoHeight || media.offsetHeight,
]

/**
 * Direct manipulation of the open image inside `element`, for pointers, touch and trackpads:
 * - swipe between images with the neighbours following the finger, a flick being enough;
 * - drag the image down or up to close, the backdrop fading with the distance;
 * - pinch, double-tap or double-click, Ctrl+wheel or a trackpad pinch to zoom, then drag
 *   or scroll to pan, with inertia and elastic bounds; a pinch below fit closes.
 * Keyboard equivalents: `+`, `-` and `0` zoom in, out and back to fit, and arrows pan the
 * zoomed image instead of stepping. A single click or tap still closes: the image starts
 * leaving at once and a second tap within the double-tap pause brings it back, zoomed. Reduced motion settles gestures without animating. Styling hooks on `element`:
 * `data-medium-zoom-zoomed` and `data-medium-zoom-gesture` (`swipe`, `close`, `pan`,
 * `pinch`). Creates no controls. Returns the unbind function.
 */
export function bindGalleryGestures({
  element,
  zoom,
  close,
}: GalleryGestureView): () => void {
  const gallery = createGallery(zoom)
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const pointers = new Map<number, number[]>()
  let [x, y, k] = rest
  let mode: Mode = ''
  // The gesture's anchor and the placement it started from, rebased whenever a finger
  // joins or leaves so nothing jumps.
  let start: number[] = []
  let anchor: number[] = []
  let spread = 1
  let from = rest
  let samples: number[][] = []
  // Geometry, measured when an interaction starts: the fitted box [left, top, right,
  // bottom], the frames' transform origin, the window and the zoom levels.
  let fitted: number[] = []
  let origin: number[] = []
  let width = 0
  let height = 0
  let detail = 2
  let measured = 0
  // Neighbour previews while swiping, [previous, next], with their fitted boxes.
  let previews: ([Media, number[]] | undefined)[] = []
  // The settling animation, kept so a touch that only stops it can let it carry on.
  let frame = 0
  let settling: [to: Placement, rate: number, done?: () => void] | undefined
  // The neighbour a released swipe is carrying the strip to, until it lands.
  let heading = 0
  let velocity = [0, 0, 0]
  let dragged = false
  // A tap waiting to tell whether a second one follows: [pressed at, x, y]. A second press
  // in time holds the close until its click arrives.
  let tap: number[] | undefined
  let seconded = false
  let pressed = 0
  let tapTimer: ReturnType<typeof setTimeout> | undefined
  let closing = false
  let zoomed = false
  let shown = gallery.getSnapshot().current

  const frames = () =>
    Array.from(
      element.querySelectorAll<Media>(
        '.medium-zoom-image--opened:not(.medium-zoom-image--leaving)'
      )
    )
  const attribute = (name: string, value: string | false) =>
    value
      ? element.setAttribute(`data-medium-zoom-${name}`, value)
      : element.removeAttribute(`data-medium-zoom-${name}`)
  const span = () => width + gap

  /** Reads the layout once per interaction; pointer moves only write. */
  const measure = () => {
    const current = frames()
    const media = current[current.length - 1]
    if (!media) {
      return false
    }
    // A touch during the opening or a scene transition takes the image where it is going.
    current.forEach(each => each.getAnimations().forEach(run => run.finish()))
    const box = media.getBoundingClientRect()
    const host = element.getBoundingClientRect()
    fitted = [box.left - x, box.top - y, box.right - x, box.bottom - y].map(
      edge => edge / k
    )
    origin = [
      host.left + media.offsetLeft + media.offsetWidth / 2,
      host.top + media.offsetTop + media.offsetHeight / 2,
    ]
    width = document.documentElement.clientWidth
    height = document.documentElement.clientHeight
    // Double tap shows the image's own pixels one to one, and at least twice its fit.
    detail = Math.max(2, mediaSize(media)[0]! / (fitted[2]! - fitted[0]!))
    measured = performance.now()
    return true
  }
  const maximum = () => Math.max(4, detail)
  /** The offsets along an axis that keep a zoomed image over the window, or centred. */
  const limits = (axis: number, scale: number) => {
    const low = fitted[axis]! * scale
    const high = fitted[axis + 2]! * scale
    const size = axis ? height : width
    const centred = ((low + high) / 2 / scale) * (1 - scale)
    return high - low > size ? [size - high, -low] : [centred, centred]
  }
  /** The placement at `scale` that keeps the point under (cx, cy) in place, in bounds. */
  const aim = (scale: number, cx: number, cy: number, dx = 0, dy = 0) => {
    const level = clamp(scale, [1, maximum()])
    const ratio = level / k
    return [
      clamp(cx - (cx - x) * ratio + dx, limits(0, level)),
      clamp(cy - (cy - y) * ratio + dy, limits(1, level)),
      level,
    ] as Placement
  }

  const apply = () => {
    const still = k === 1 && !x && !y
    for (const media of frames()) {
      media.style.translate = still
        ? ''
        : `${x - (1 - k) * origin[0]!}px ${y - (1 - k) * origin[1]!}px`
      media.style.scale = still ? '' : `${k}`
    }
    previews.forEach((preview, index) => {
      if (preview) {
        preview[0].style.translate = `${x + (index ? span() : -span())}px`
      }
    })
    // The backdrop fades as the image is dragged away or pinched below its fit.
    const overlay = element.querySelector<HTMLElement>('.medium-zoom-overlay')
    if (overlay) {
      const shade =
        k > 1 ? 1 : Math.max(0, 1 - (2 * Math.abs(y)) / height - 2 * (1 - k))
      overlay.style.opacity = shade < 1 ? `${shade}` : ''
      overlay.style.transition = shade < 1 ? 'none' : ''
    }
    if (zoomed !== k > 1.01) {
      zoomed = !zoomed
      attribute('zoomed', zoomed && 'true')
    }
  }

  const stop = () => {
    cancelAnimationFrame(frame)
    settling = undefined
    heading = 0
  }
  /** Springs to `to` from the current velocity, without overshoot; instant for reduced motion. */
  const animate = (to: Placement, rate = snappy, done?: () => void) => {
    stop()
    const begin = [x, y, k]
    // Speed towards the target beyond what the spring can absorb would overshoot.
    const initial = begin.map((value, axis) => {
      const away = value - to[axis]!
      const speed = velocity[axis]!
      return speed * away < 0
        ? Math.sign(speed) * Math.min(Math.abs(speed), rate * Math.abs(away))
        : speed
    })
    let started: number | undefined
    const step = (now: number) => {
      started ??= now
      const time = now - started
      const decay = Math.exp(-rate * time)
      let moving = false
      ;[x, y, k] = begin.map((value, axis) => {
        const away = value - to[axis]!
        const pull = initial[axis]! + rate * away
        const offset = (away + pull * time) * decay
        velocity[axis] = (pull - rate * (away + pull * time)) * decay
        const tolerance = axis > 1 ? 0.001 : 0.3
        moving ||=
          Math.abs(offset) > tolerance ||
          Math.abs(velocity[axis]! * 16) > tolerance
        return to[axis]! + offset
      }) as Placement
      if (!moving || motion.matches) {
        ;[x, y, k] = to
        velocity = [0, 0, 0]
        settling = undefined
      }
      apply()
      if (settling) {
        frame = requestAnimationFrame(step)
      } else {
        done?.()
      }
    }
    settling = [to, rate, done]
    if (motion.matches) {
      step(0)
    } else {
      frame = requestAnimationFrame(step)
    }
  }
  /** Settles a pan or pinch inside the bounds, coasting on when the scale stays. */
  const settle = () => {
    const kept = clamp(k, [1, maximum()]) === k
    const [vx, vy] = kept ? velocity : [0, 0]
    animate(
      aim(k, anchor[0]!, anchor[1]!, vx! / coast, vy! / coast),
      kept ? coast : snappy
    )
  }

  const drop = () => {
    previews.forEach(preview => preview?.[0].remove())
    previews = []
  }
  /** Zooming by keys, wheel or trackpad takes the image from a swipe where it is. */
  const hold = () => {
    stop()
    drop()
  }
  /** Neighbours drawn from their attached images, fitted to the window beside this one. */
  const reveal = () => {
    const { images, index } = gallery.getSnapshot()
    const host = element.getBoundingClientRect()
    const margin = zoom.getOptions().margin || 0
    previews = [images[index - 1], images[index + 1]].map(image => {
      if (!image) {
        return
      }
      const [naturalWidth, naturalHeight] = mediaSize(image)
      const scale = Math.min(
        (width - margin * 2) / naturalWidth!,
        (height - margin * 2) / naturalHeight!
      )
      if (!(scale < Infinity)) {
        return
      }
      const box = [
        (width - naturalWidth! * scale) / 2,
        (height - naturalHeight! * scale) / 2,
        naturalWidth! * scale,
        naturalHeight! * scale,
      ]
      const preview = image.cloneNode() as Media
      for (const name of ['id', 'class', 'srcset', 'sizes', 'loading']) {
        preview.removeAttribute(name)
      }
      if ((image as Media).currentSrc) {
        preview.setAttribute('src', (image as Media).currentSrc!)
      }
      preview.ariaHidden = 'true'
      preview.style.cssText = `position:absolute;margin:0;pointer-events:none;left:${box[0]! - host.left}px;top:${box[1]! - host.top}px;width:${box[2]}px;height:${box[3]}px`
      element.append(preview)
      return [preview, box] as [Media, number[]]
    })
  }
  /**
   * Swaps in the neighbour the swipe is bringing to the middle, then fits the real frame.
   * A finger that caught the strip on its way keeps holding the new image where it is.
   */
  const navigate = (direction: number, held?: boolean) => {
    heading = 0
    const offset = x + direction * span()
    const box = previews[direction > 0 ? 1 : 0]?.[1]
    const { images, index } = gallery.getSnapshot()
    const target = images[index + direction]
    const land = () => {
      velocity = [0, 0, 0]
      if (closing) {
        return
      }
      if (shown !== target || !box || !measure()) {
        animate(rest, snappy, drop)
        return
      }
      // Start the frame exactly over the preview, which the engine may have fitted
      // differently, and let it settle into its own fit.
      k = box[2]! / (fitted[2]! - fitted[0]!)
      x = box[0]! - fitted[0]! * k + offset
      y = box[1]! - fitted[1]! * k
      apply()
      if (!held) {
        animate(rest)
      }
    }
    const opening = gallery.select(index + direction, { instant: true })
    // The engine swaps scenes at once, unless the previous one is still being mounted: by
    // the time it does, the moment has passed and the strip only settles.
    if (shown === target) {
      land()
    } else {
      void opening.then(() => !closing && animate(rest, snappy, drop))
    }
  }

  const centroid = () => {
    const points = [...pointers.values()].slice(0, 2)
    return [0, 1].map(
      axis =>
        points.reduce((sum, point) => sum + point[axis]!, 0) / points.length
    )
  }
  const distance = () => {
    const [a, b] = [...pointers.values()]
    return b ? Math.hypot(a![0]! - b[0]!, a![1]! - b[1]!) : 1
  }
  const rebase = () => {
    start = centroid()
    spread = distance()
    from = [x, y, k]
  }
  const capture = () => {
    for (const id of pointers.keys()) {
      try {
        element.setPointerCapture(id)
      } catch {
        // Synthetic and already released pointers cannot be captured.
      }
    }
  }
  const enter = (next: Mode) => {
    mode = next
    attribute('gesture', next !== 'pending' && next)
  }

  // A swipe past halfway to its neighbour is as good as landed; before, the image the user
  // is moving away from is still the one on screen.
  const landing = () => (Math.abs(x) > span() / 2 && heading) || 0
  /** A swipe as good as landed lands at once, so a control or key acts from its image. */
  const land = () => {
    const direction = landing()
    if (direction) {
      stop()
      navigate(direction)
    }
  }
  const down = (event: PointerEvent) => {
    if (closing || event.button > 0) {
      return
    }
    if ((event.target as Element).closest(`button,a[href],${ownKeys}`)) {
      land()
      return
    }
    if (event.isPrimary) {
      pointers.clear()
      pressed = event.timeStamp
      seconded =
        !!tap &&
        pressed - tap[0]! < doubleTap &&
        Math.hypot(event.clientX - tap[1]!, event.clientY - tap[2]!) < 40
      if (seconded) {
        // Waits for this press's click, or lets the first tap close if it never comes.
        clearTimeout(tapTimer)
        tapTimer = setTimeout(decide, doubleTap * 2)
      }
    }
    if (pointers.size > 1) {
      return
    }
    // A swipe caught as good as landed lands now, so every swipe counts; before, the
    // finger holds the strip where it is, both images still in place.
    const caught = landing()
    if (!pointers.size) {
      // A touch that catches the image on its way is not a tap, unless it is the second
      // tap, which catches the first one's hint.
      dragged =
        !seconded && !!settling && Math.hypot(velocity[0]!, velocity[1]!) > 0.1
      if (caught) {
        stop()
        navigate(caught, true)
        // Never a tap: released where it is, the image settles from there.
        dragged = true
        // The press landed on the image just replaced: its default would drop focus.
        event.preventDefault()
      }
      cancelAnimationFrame(frame)
      if (!measure()) {
        return
      }
      enter('pending')
    } else {
      dragged = true
      drop()
      enter('pinch')
    }
    pointers.set(event.pointerId, [event.clientX, event.clientY])
    // The centroid jumps when a finger joins or leaves: speed is measured afresh.
    samples = []
    rebase()
    // A caught swipe replaced the image under the finger: the gesture stays with the stage.
    if (mode === 'pinch' || caught) {
      capture()
    }
  }
  const move = (event: PointerEvent) => {
    // A mouse moving off after a click is not double-clicking: no need to wait.
    if (
      tap &&
      !seconded &&
      event.pointerType === 'mouse' &&
      Math.hypot(event.clientX - tap[1]!, event.clientY - tap[2]!) > slop
    ) {
      decide()
    }
    if (!pointers.has(event.pointerId)) {
      return
    }
    pointers.set(event.pointerId, [event.clientX, event.clientY])
    const [cx, cy] = (anchor = centroid())
    let dx = cx! - start[0]!
    let dy = cy! - start[1]!
    samples = samples
      .filter(sample => event.timeStamp - sample[0]! < 100)
      .concat([[event.timeStamp, cx!, cy!]])
    if (mode === 'pending') {
      if (Math.hypot(dx, dy) < slop) {
        return
      }
      dragged = true
      settling = undefined
      // A drag is never the second tap: it takes the image from where the first left it.
      forget()
      // Catching a swipe on its way keeps swiping, as does an image left off centre.
      const next =
        k > 1.01
          ? 'pan'
          : previews.length || x || Math.abs(dx) > Math.abs(dy)
            ? 'swipe'
            : 'close'
      enter(next)
      capture()
      if (next === 'swipe' && !previews.length) {
        reveal()
      }
      // Follow from here: the slop is not made up, so the image never jumps.
      rebase()
      dx = dy = 0
    }
    const [x0, y0, k0] = from
    if (mode === 'pinch') {
      k = rubber((k0 * distance()) / spread, [1, maximum()], 1)
      // The point that was under the fingers stays under them.
      x = cx! - ((start[0]! - x0) * k) / k0
      y = cy! - ((start[1]! - y0) * k) / k0
    } else if (mode === 'pan') {
      x = rubber(x0 + dx, limits(0, k), width)
      y = rubber(y0 + dy, limits(1, k), height)
    } else if (mode === 'swipe') {
      const { canPrevious, canNext } = gallery.getSnapshot()
      x = rubber(
        x0 + dx,
        [canNext ? -span() : 0, canPrevious ? span() : 0],
        width
      )
    } else {
      x = x0 + dx
      y = y0 + dy
    }
    apply()
  }
  const up = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) {
      return
    }
    if (event.type === 'pointerup') {
      move(event)
    }
    pointers.delete(event.pointerId)
    if (pointers.size) {
      enter('pan')
      samples = []
      rebase()
      return
    }
    const ended = mode
    const interrupted = settling
    enter('')
    if (ended === 'pending') {
      // A touch that only caught a moving image lets it carry on, unless it was coasting.
      if (interrupted && interrupted[1] !== coast) {
        animate(...interrupted)
      } else if (dragged) {
        velocity = [0, 0, 0]
        settle()
      }
      return
    }
    const recent = samples.filter(sample => event.timeStamp - sample[0]! < 100)
    const first = recent[0]
    const last = recent[recent.length - 1]
    const elapsed = first && last ? last[0]! - first[0]! : 0
    velocity = elapsed
      ? [
          (last![1]! - first![1]!) / elapsed,
          (last![2]! - first![2]!) / elapsed,
          0,
        ]
      : [0, 0, 0]
    if (ended === 'swipe') {
      const { canPrevious, canNext } = gallery.getSnapshot()
      const [vx] = velocity
      const ahead = x + vx! * 200
      // Judged from where the drag started: a swipe that caught the strip on its way
      // starts off centre.
      const direction =
        canNext && (vx! < -fling || ahead < -span() / 2) && x < from[0]!
          ? 1
          : canPrevious && (vx! > fling || ahead > span() / 2) && x > from[0]!
            ? -1
            : 0
      animate(
        [-direction * span(), 0, 1],
        snappy,
        direction ? () => navigate(direction) : drop
      )
      heading = direction
    } else if (ended === 'close') {
      const [, vy] = velocity
      if (Math.abs(y) > height / 6 || (vy! * y > 0 && Math.abs(vy!) > fling)) {
        close()
      } else {
        animate(rest)
      }
    } else if (k < 0.8) {
      close()
    } else {
      settle()
    }
  }

  /**
   * Double tap zooms in to detail, then further each time as a pinch would, and back to fit
   * from the maximum; a single tap closes, as ever.
   */
  const click = (event: MouseEvent) => {
    const frameClicked = frames().includes(event.target as Media)
    if (dragged || frameClicked) {
      event.stopPropagation()
    }
    if (dragged || !frameClicked) {
      dragged = false
      return
    }
    const [cx, cy] = [event.clientX, event.clientY]
    if (tap && seconded) {
      forget()
      if (measure()) {
        velocity = [0, 0, 0]
        animate(
          k > maximum() - 0.01 ? rest : aim(k > 1.01 ? k * 2 : detail, cx, cy)
        )
      }
      return
    }
    clearTimeout(tapTimer)
    tap = [pressed, cx, cy]
    // The pause runs from the press, so the click's own latency is not added to it. A
    // click with no press, as from a script, closes at once.
    tapTimer = setTimeout(
      decide,
      Math.max(0, pressed + doubleTap - performance.now())
    )
    // The close starts now, reversibly: the image gives a little, the backdrop and the
    // controls fade, and closing carries on from there.
    if (k <= 1.01 && measure()) {
      attribute('gesture', 'close')
      velocity = [0, 0, 0]
      animate([
        ((fitted[0]! + fitted[2]!) / 2) * (1 - hint),
        ((fitted[1]! + fitted[3]!) / 2) * (1 - hint),
        hint,
      ])
    }
  }
  /** No second tap came: a fitted image closes, a zoomed one stays. */
  const decide = () => {
    const leave = k <= 1.01 && tap
    forget()
    if (leave) {
      close()
    }
  }
  const forget = () => {
    clearTimeout(tapTimer)
    tap = undefined
    seconded = false
    attribute('gesture', mode !== 'pending' && mode)
  }

  // Keyboard equivalents act at once: they are pressed again and again.
  const keydown = (event: KeyboardEvent) => {
    land()
    const factor = { '+': 1.5, '=': 1.5, '-': 1 / 1.5, '0': 0 }[event.key]
    const [dx, dy] = (k > 1.01 &&
      {
        ArrowLeft: [1, 0],
        ArrowRight: [-1, 0],
        ArrowUp: [0, 1],
        ArrowDown: [0, -1],
      }[event.key]) || [0, 0]
    if (
      closing ||
      !isGalleryKey(event) ||
      (factor === undefined && !dx && !dy) ||
      !measure()
    ) {
      return
    }
    event.preventDefault()
    hold()
    ;[x, y, k] =
      factor === undefined
        ? aim(k, width / 2, height / 2, (dx! * width) / 8, (dy! * height) / 8)
        : aim(factor ? k * factor : 1, width / 2, height / 2)
    apply()
  }
  // Ctrl+wheel is how browsers report a trackpad pinch; a plain wheel pans a zoomed image
  // and otherwise scrolls the page, which closes the zoom as ever.
  const wheel = (event: WheelEvent) => {
    if (closing || (!event.ctrlKey && k <= 1.01)) {
      return
    }
    event.preventDefault()
    if (performance.now() - measured > 300 && !measure()) {
      return
    }
    measured = performance.now()
    hold()
    const lines = event.deltaMode ? 16 : 1
    const { clientX, clientY } = event
    ;[x, y, k] = event.ctrlKey
      ? aim(
          k * Math.exp(-clamp(event.deltaY * lines, [-50, 50]) / 100),
          clientX,
          clientY
        )
      : aim(k, clientX, clientY, -event.deltaX * lines, -event.deltaY * lines)
    apply()
  }
  // Safari reports trackpad pinches as gesture events instead.
  let gestureScale = 1
  const gesture = (event: Event) => {
    const { scale, clientX, clientY, type } = event as Event & {
      scale: number
      clientX: number
      clientY: number
    }
    if (closing || pointers.size || !measure()) {
      return
    }
    event.preventDefault()
    hold()
    if (type === 'gesturestart') {
      gestureScale = k
    } else {
      ;[x, y, k] = aim(gestureScale * scale, clientX, clientY)
      apply()
    }
  }

  // Closing by any means takes the image back from wherever the gesture left it.
  const closed = () => {
    closing = true
    stop()
    clearTimeout(tapTimer)
    drop()
    if (!motion.matches) {
      for (const media of frames()) {
        media.animate(
          [
            {
              translate: media.style.translate || '0px',
              scale: media.style.scale || '1',
            },
            { translate: '0px', scale: '1' },
          ],
          { duration: 300, easing: 'cubic-bezier(0.2, 0, 0.2, 1)' }
        )
      }
    }
    ;[x, y, k] = rest
    apply()
  }
  // Another image replaced this one, by keys, buttons or a swipe: it starts fitted.
  const unsubscribe = gallery.subscribe(() => {
    const { current } = gallery.getSnapshot()
    if (current !== shown) {
      shown = current
      stop()
      drop()
      forget()
      pointers.clear()
      enter('')
      ;[x, y, k] = rest
      apply()
    }
  })

  const style = element.style
  const { touchAction, userSelect } = style
  // The page behind the modal has nothing to scroll or zoom: every touch is the gallery's.
  style.touchAction = 'none'
  style.userSelect = 'none'
  const listeners = [
    ['pointerdown', down],
    ['pointermove', move],
    ['pointerup', up],
    ['pointercancel', up],
    ['click', click, true],
    ['keydown', keydown, true],
    ['wheel', wheel],
    ['gesturestart', gesture],
    ['gesturechange', gesture],
    ['dragstart', (event: Event) => event.preventDefault()],
  ] as const
  // Not passive: the wheel and gestures are prevented when they zoom or pan.
  for (const [type, listener, capture] of listeners) {
    element.addEventListener(type, listener as EventListener, {
      capture,
      passive: false,
    })
  }
  // The engine refits the image to a resized window: the gesture's zoom goes with it.
  const resized = () => {
    if (!closing) {
      hold()
      ;[x, y, k] = rest
      apply()
    }
  }
  addEventListener('resize', resized)
  zoom.on('close', closed)
  return () => {
    removeEventListener('resize', resized)
    stop()
    clearTimeout(tapTimer)
    drop()
    unsubscribe()
    zoom.off('close', closed)
    style.touchAction = touchAction
    style.userSelect = userSelect
    for (const [type, listener, capture] of listeners) {
      element.removeEventListener(type, listener as EventListener, capture)
    }
  }
}
