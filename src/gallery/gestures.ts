import type { ZoomContent } from 'medium-zoom/core'

import { createGallery } from './index'
import { elementsWithOwnKeys, isGalleryKey } from './keyboard'

/**
 * What `bindGalleryGestures()` binds to: the view a `ZoomContent` receives will do. Aborting
 * `signal`, as the view's own does on close, unbinds the gestures.
 */
export type GalleryGestureView = Pick<
  Parameters<ZoomContent>[0],
  'element' | 'zoom'
> & { readonly signal?: AbortSignal }

/** The open image over its fitted box: screen = fitted × k + (x, y). */
type Placement = [x: number, y: number, k: number]
type Mode = '' | 'pending' | 'swipe' | 'close' | 'pan' | 'pinch'
type Media = HTMLElement & {
  naturalWidth?: number
  videoWidth?: number
  naturalHeight?: number
  videoHeight?: number
  currentSrc?: string
}

// Spring rates per ms: settling a gesture, and coasting after a pan.
const snappy = 0.022
const coast = 0.007
// Pixels before a press becomes a drag, and px/ms that make a flick.
const slop = 8
const fling = 0.25
const gap = 16
// Longest pause between double-tap presses, and the scale a single tap shrinks the
// image to while waiting for a second one.
const doubleTap = 300
const hint = 0.95
const rest: Placement = [0, 0, 1]

const clamp = (value: number, [min, max]: number[]) =>
  Math.min(Math.max(value, min!), max!)
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
 * Binds direct manipulation of the open image inside `element`, for mouse, touch and
 * trackpads:
 * - swipe or flick between images, the neighbours following the finger;
 * - drag the image up or down to close;
 * - pinch, double-tap, double-click, Ctrl+wheel or a trackpad pinch to zoom, then drag or
 *   scroll to pan; pinching below fit closes;
 * - `+`, `-` and `0` zoom in, out and back to fit; arrows pan a zoomed image.
 *
 * A single click or tap still closes, after the double-tap pause. Reduced motion settles
 * gestures without animating. Creates no controls.
 *
 * Styling hooks on `element`: `data-medium-zoom-zoomed`, and `data-medium-zoom-gesture`
 * (`swipe`, `close`, `pan` or `pinch`).
 *
 * @returns A function that unbinds the gestures.
 */
export function bindGalleryGestures({
  element,
  zoom,
  signal,
}: GalleryGestureView): () => void {
  if (signal?.aborted) {
    return () => {}
  }
  const gallery = createGallery(zoom)
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const pointers = new Map<number, number[]>()
  let [x, y, k] = rest
  let mode: Mode = ''
  // Rebased whenever a finger joins or leaves, so the image never jumps.
  let start: number[] = []
  let anchor: number[] = []
  let spread = 1
  let from = rest
  let samples: number[][] = []
  // Measured when an interaction starts. `fitted` is [left, top, right, bottom] at k = 1.
  let fitted: number[] = []
  let origin: number[] = []
  let width = 0
  let height = 0
  let detail = 2
  let measured = 0
  // [previous, next], each with its fitted box.
  let previews: ([Media, number[]] | undefined)[] = []
  // Kept so a touch that only stops the animation can let it carry on.
  let frame = 0
  let settling: [to: Placement, rate: number, done?: () => void] | undefined
  // The direction a released swipe is carrying the strip, until it lands.
  let heading = 0
  let velocity = [0, 0, 0]
  let dragged = false
  // A tap waiting for a possible second one: [pressed at, x, y]. `seconded` marks a second
  // press in time, which holds the close until its click arrives.
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

  /** Reads layout once per interaction, so pointer moves only write and never reflow. */
  const measure = () => {
    const current = frames()
    const media = current[current.length - 1]
    if (!media) {
      return false
    }
    // A touch mid-animation takes the image where it is going, so measurements are final.
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
    // Double tap shows the image's pixels one to one, and at least twice its fit.
    detail = Math.max(2, mediaSize(media)[0]! / (fitted[2]! - fitted[0]!))
    measured = performance.now()
    return true
  }
  const maximum = () => Math.max(4, detail)
  /** Offsets that keep a zoomed image covering the window, or centred if smaller. */
  const limits = (axis: number, scale: number) => {
    const low = fitted[axis]! * scale
    const high = fitted[axis + 2]! * scale
    const size = axis ? height : width
    const centred = ((low + high) / 2 / scale) * (1 - scale)
    return high - low > size ? [size - high, -low] : [centred, centred]
  }
  /** The in-bounds placement at `scale` that keeps the point under (cx, cy) still. */
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
  /** A critically damped spring to `to`, starting from the current velocity. */
  const animate = (to: Placement, rate = snappy, done?: () => void) => {
    stop()
    const begin = [x, y, k]
    // Speed towards the target beyond what the spring absorbs would overshoot: cap it.
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
  /** Coasts on after a pan, but snaps back when the scale overshot its bounds. */
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
  /** Zooming by keys, wheel or trackpad interrupts a swipe, taking the image as it is. */
  const endSwipe = () => {
    stop()
    drop()
  }
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
  /** `held`: a finger caught the strip mid-swipe and keeps holding the new image. */
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
      // The engine may fit the frame differently from the preview: start it exactly over
      // the preview and let it settle into its own fit.
      k = box[2]! / (fitted[2]! - fitted[0]!)
      x = box[0]! - fitted[0]! * k + offset
      y = box[1]! - fitted[1]! * k
      apply()
      if (!held) {
        animate(rest)
      }
    }
    const opening = gallery.select(index + direction, { instant: true })
    // The engine swaps scenes at once unless the previous one is still mounting; by then
    // the moment has passed and the strip only settles.
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

  // Past halfway, a swipe counts as landed; before, the image being left is still current.
  const landing = () => (Math.abs(x) > span() / 2 && heading) || 0
  /** Lands such a swipe at once, so a control or key acts on the image the user sees. */
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
    if (
      (event.target as Element).closest(`button,a[href],${elementsWithOwnKeys}`)
    ) {
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
    // Catching a swipe past halfway lands it, so no swipe is lost; before that, the finger
    // holds the strip with both images in place.
    const caught = landing()
    if (!pointers.size) {
      // Catching a moving image is not a tap, unless it is a second tap catching the
      // first one's shrink.
      dragged =
        !seconded && !!settling && Math.hypot(velocity[0]!, velocity[1]!) > 0.1
      if (caught) {
        stop()
        navigate(caught, true)
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
    // The centroid jumps when a finger joins or leaves: measure speed afresh.
    samples = []
    rebase()
    // A caught swipe replaced the image under the finger: capture keeps the gesture here.
    if (mode === 'pinch' || caught) {
      capture()
    }
  }
  const move = (event: PointerEvent) => {
    // A mouse moving away after a click is not double-clicking: close without waiting.
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
    // The last 100ms of movement plus the sample just before, so speed is measured
    // between two real points however sparse the events.
    const recent = samples.findIndex(
      sample => event.timeStamp - sample[0]! < 100
    )
    samples = samples
      .slice(recent < 0 ? -1 : Math.max(0, recent - 1))
      .concat([[event.timeStamp, cx!, cy!]])
    if (mode === 'pending') {
      if (Math.hypot(dx, dy) < slop) {
        return
      }
      dragged = true
      settling = undefined
      // A drag is never a second tap: it takes the image from where the first left it.
      forget()
      // Catching a swipe mid-way keeps swiping, as does an image left off centre.
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
      // Follow from here rather than making up the slop, so the image never jumps.
      rebase()
      dx = dy = 0
    }
    const [x0, y0, k0] = from
    if (mode === 'pinch') {
      k = rubber((k0 * distance()) / spread, [1, maximum()], 1)
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
    // A finger that rested before lifting has no speed left.
    const first = samples[0]
    const last = samples[samples.length - 1]
    const elapsed =
      first && last && event.timeStamp - last[0]! < 100
        ? last[0]! - first[0]!
        : 0
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
      // Judged from where the drag started, since a swipe that caught the strip mid-way
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
        void zoom.close('gesture')
      } else {
        animate(rest)
      }
    } else if (k < 0.8) {
      void zoom.close('gesture')
    } else {
      settle()
    }
  }

  /** Double tap zooms to detail, then doubles, and returns to fit from the maximum. */
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
    // Timed from the press so the click's latency is not added. A scripted click, with no
    // press, closes at once.
    tapTimer = setTimeout(
      decide,
      Math.max(0, pressed + doubleTap - performance.now())
    )
    // Start closing now, reversibly, so a single tap feels immediate: the image shrinks a
    // little and closing carries on from there.
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
  const decide = () => {
    const leave = k <= 1.01 && tap
    forget()
    if (leave) {
      void zoom.close('pointer')
    }
  }
  const forget = () => {
    clearTimeout(tapTimer)
    tap = undefined
    seconded = false
    attribute('gesture', mode !== 'pending' && mode)
  }

  // Keys apply without animating: they are pressed repeatedly.
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
    endSwipe()
    ;[x, y, k] =
      factor === undefined
        ? aim(k, width / 2, height / 2, (dx! * width) / 8, (dy! * height) / 8)
        : aim(factor ? k * factor : 1, width / 2, height / 2)
    apply()
  }
  // Browsers report a trackpad pinch as Ctrl+wheel. A plain wheel on a fitted image is left
  // to scroll the page, which closes the zoom.
  const wheel = (event: WheelEvent) => {
    if (closing || (!event.ctrlKey && k <= 1.01)) {
      return
    }
    event.preventDefault()
    if (performance.now() - measured > 300 && !measure()) {
      return
    }
    measured = performance.now()
    endSwipe()
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
    endSwipe()
    if (type === 'gesturestart') {
      gestureScale = k
    } else {
      ;[x, y, k] = aim(gestureScale * scale, clientX, clientY)
      apply()
    }
  }

  // Closing by any means animates the image back from wherever the gesture left it.
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
  // Whatever replaced the image (keys, buttons or a swipe), the new one starts fitted.
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
  // The engine refits the image to a resized window, so the gesture's zoom is reset.
  const resized = () => {
    if (!closing) {
      endSwipe()
      ;[x, y, k] = rest
      apply()
    }
  }
  addEventListener('resize', resized)
  zoom.on('close', closed)
  let bound = true
  const unbind = () => {
    if (!bound) {
      return
    }
    bound = false
    signal?.removeEventListener('abort', unbind)
    removeEventListener('resize', resized)
    stop()
    clearTimeout(tapTimer)
    drop()
    unsubscribe()
    gallery.dispose()
    zoom.off('close', closed)
    style.touchAction = touchAction
    style.userSelect = userSelect
    for (const [type, listener, capture] of listeners) {
      element.removeEventListener(type, listener as EventListener, capture)
    }
  }
  signal?.addEventListener('abort', unbind)
  return unbind
}
