import type { Stage, StageView } from '@/core/stage'
import { createOverlay, getImagesFromSelectors } from '@/zoom/dom'
import {
  cloneImage,
  fitImage,
  type Frame,
  framePlacement,
  isImage,
  type ZoomTarget,
} from '@/zoom/frame'
import { waitForTransition } from '@/zoom/transition'
import type {
  CoreZoomOptions,
  ZoomInstance,
  ZoomLoadContext,
  ZoomLoader,
  ZoomOpenOptions,
  ZoomSelector,
  ZoomViewport,
} from '@/zoom/types'

declare const __EVENTS__: boolean

/** Open options of a zoom created with a renderer (`createZoom(…, { renderer })`). */
export interface ModalOpenOptions extends ZoomOpenOptions {
  /**
   * The control that opened the zoom. The renderer returns focus to it on close.
   *
   * @default document.activeElement
   */
  trigger?: HTMLElement
  /**
   * Replaces the open image at once, as while stepping: no scene transition, and the
   * high-resolution image loads after a pause. For gestures that already moved the new image
   * into place, such as a swipe.
   */
  instant?: boolean
}

/**
 * The DOM event behind each close reason, as reported by `event` in the `close` and `closed`
 * details. `never` marks reasons no event causes.
 */
export interface ZoomCloseEventMap {
  /** `close()` without a reason; the event when it is called as a listener. */
  api: Event
  /** An application control, such as a close button. */
  control: Event
  /** A click or tap on the zoomed image. */
  'image-press': MouseEvent
  /** A click or tap on the backdrop. */
  'outside-press': MouseEvent
  /** The Escape key. */
  'escape-key': KeyboardEvent
  /** Another close request from the platform, such as the Android back gesture. */
  back: Event
  /** A `method="dialog"` form. */
  form: SubmitEvent
  /** A drag or pinch that dismisses the image. */
  gesture: PointerEvent
  /** Scrolling the page past `scrollOffset`. */
  scroll: never
  /** Images detached while the zoom was open. */
  detach: never
  /** Another zoom of its group opened. */
  group: never
}

/** Why a zoom closed. See `ZoomCloseEventMap` for each reason and its event. */
export type ZoomCloseReason = keyof ZoomCloseEventMap

/** Options of `close()`. */
export interface ZoomCloseOptions<
  Reason extends ZoomCloseReason = ZoomCloseReason,
> {
  /**
   * Why, as reported by the `close` and `closed` events.
   *
   * @default 'api'
   */
  readonly reason?: Reason
  /** The DOM event behind it, reported with the reason. */
  readonly event?: ZoomCloseEventMap[Reason]
}

/**
 * The `detail` of the `close` and `closed` events. One member per reason, so checking
 * `reason` narrows `event`.
 */
export type ZoomCloseDetail<Reason extends ZoomCloseReason = ZoomCloseReason> =
  Reason extends unknown
    ? {
        readonly zoom: ZoomInstance
        readonly reason: Reason
        /** The DOM event that closed the zoom; undefined for calls without one. */
        readonly event?: ZoomCloseEventMap[Reason]
      }
    : never

/** Where a zoom is in its lifecycle. Replacing the open image goes back to `opening`. */
export type ZoomStatus = 'closed' | 'opening' | 'open' | 'closing'

/** An immutable view of a zoom: a new frozen object whenever anything in it changes. */
export interface ZoomState {
  readonly status: ZoomStatus
  /** The open image, or `null` while the zoom is closed. */
  readonly image: HTMLElement | null
  /** The attached images, in attach order. The same array until the collection changes. */
  readonly images: readonly HTMLElement[]
}

/** The `detail` of each `medium-zoom:<type>` event, by type. */
export interface ZoomEventMap {
  open: { readonly zoom: ZoomInstance }
  opened: { readonly zoom: ZoomInstance }
  close: ZoomCloseDetail
  closed: ZoomCloseDetail
  attach: { readonly zoom: ZoomInstance }
  detach: { readonly zoom: ZoomInstance }
  update: { readonly zoom: ZoomInstance }
}
/** A zoom event, dispatched on the image it concerns. */
export type ZoomEvent<Type extends keyof ZoomEventMap = keyof ZoomEventMap> =
  CustomEvent<ZoomEventMap[Type]>

/** The zooms of a group open one at a time; `ZoomGroup` is its public, opaque type. */
export interface Group {
  /** The zoom that claimed the group: opening, open or closing. */
  __mz_shown?: EngineZoom
  /** Bumped by every request that has to wait, so only the latest one opens. */
  __mz_ticket: number
}

/** What the engine builds; `Zoom` and `ModalZoom` are its public types. */
export interface EngineZoom extends Omit<
  ZoomInstance,
  'open' | 'close' | 'toggle'
> {
  open(options?: ModalOpenOptions): Promise<EngineZoom>
  close(options?: ZoomCloseOptions): Promise<EngineZoom>
  toggle(options?: ModalOpenOptions): Promise<EngineZoom>
  getSnapshot(): ZoomState
  subscribe(listener: () => void): () => void
  preload(target: HTMLElement): void
}

/** One image on screen, from the request that opens it until it is closed or replaced. */
interface Scene {
  __mz_view?: StageView
  __mz_original?: ZoomTarget
  __mz_frames?: Frame[]
  __mz_closing?: boolean
  /** Ends the opening; unset once it has ended, opened or not. */
  __mz_cancelOpen?: ((opened?: boolean) => void) | null
  __mz_viewportScale?: number
  __mz_isPinching?: boolean
  __mz_scrollTimer?: ReturnType<typeof setTimeout>
  __mz_refit?: () => void
  /** Cancels the loader, pending or running. */
  __mz_release?: () => void
  __mz_requested?: number
  __mz_reason?: ZoomCloseReason
  __mz_event?: Event
}

// Moving on within this many milliseconds of a scene is stepping, as while holding an arrow key.
const pause = 300

/** Computed on each call, so it follows whatever sets the page's theme. */
const pageBackground = (): string => {
  for (const node of [document.body, document.documentElement]) {
    const color = getComputedStyle(node).backgroundColor
    // A transparent background computes to `rgba(…, 0)`: the color comes from further up.
    if (!color.endsWith(', 0)')) {
      return color
    }
  }
  return 'Canvas'
}

/**
 * The composed zoom: explicit state, close reasons, groups, and optional strategies for
 * loading, measuring and presenting. Strategies are fixed for the zoom and its clones.
 */
export const createEngine = (
  selector: ZoomSelector | undefined,
  options: CoreZoomOptions,
  loader?: ZoomLoader,
  measureViewport?: ZoomViewport,
  stage?: Stage,
  group?: Group
): EngineZoom => {
  const dispatch = (image: ZoomTarget, type: string, closed?: Scene) => {
    if (!__EVENTS__) {
      return
    }
    image.dispatchEvent(
      new CustomEvent(`medium-zoom:${type}`, {
        detail: closed
          ? {
              zoom,
              reason: closed.__mz_reason || 'api',
              event: closed.__mz_event,
            }
          : { zoom },
      })
    )
  }

  let status: ZoomStatus = 'closed'
  let state: ZoomState | undefined
  const subscribers = new Set<() => void>()
  const commit = (next = status) => {
    status = next
    release()
    state = Object.freeze({
      status,
      image: (active.__mz_original || null) as HTMLElement | null,
      images: Object.freeze(images) as readonly HTMLElement[],
    })
    // A failing subscriber must not interrupt the lifecycle that notifies it.
    subscribers.forEach(listener => {
      try {
        listener()
      } catch (error) {
        reportError(error)
      }
    })
  }

  const isAttached = (image: ZoomTarget) => images.indexOf(image) !== -1

  const handleClick = (event: Event) => {
    if (event.target === overlay) {
      void closeFor('outside-press', 'api', event)
    }
  }

  const handleScroll = () => {
    if (!active.__mz_original) {
      return
    }

    // Pinching and panning a magnified page must keep the full-size image open.
    if (
      active.__mz_isPinching ||
      visualViewport!.scale > active.__mz_viewportScale!
    ) {
      scrollTop = scrollY
      clearTimeout(active.__mz_scrollTimer)
      active.__mz_scrollTimer = undefined
      return
    }

    if (active.__mz_cancelOpen || active.__mz_closing) {
      return
    }

    if (
      Math.abs(scrollTop - scrollY) > zoomOptions.scrollOffset! &&
      !active.__mz_scrollTimer
    ) {
      active.__mz_scrollTimer = setTimeout(() => void closeFor('scroll'), 150)
    }
  }

  const handleTouch = (event: TouchEvent) => {
    if (event.touches.length >= 2) {
      active.__mz_isPinching = true
    }
    if (active.__mz_isPinching) {
      handleScroll()
    }

    // Keep protecting the gesture when one finger lifts before the other.
    if (event.touches.length === 0) {
      active.__mz_isPinching = false
    }
  }

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      void closeFor('escape-key', 'api', event)
    }
  }

  const handleResize = () => {
    if (active.__mz_refit) {
      active.__mz_refit()
    }
  }

  const update = (options: CoreZoomOptions = {}) => {
    if (options.background) {
      overlay.style.background = options.background
    }

    zoomOptions = { ...zoomOptions, ...options }

    images.forEach(image => {
      dispatch(image, 'update')
    })

    return zoom
  }

  const attach: EngineZoom['attach'] = function () {
    const newImages = getImagesFromSelectors(
      arguments,
      image => !isAttached(image)
    )
    if (newImages.length) {
      images = images.concat(newImages)
      newImages.forEach(image => {
        eventListeners.forEach(([type, listener, options]) => {
          image.addEventListener(type, listener, options)
        })
      })
      newImages.forEach(image => dispatch(image, 'attach'))
      commit()
    }
    return zoom
  }

  const detach: EngineZoom['detach'] = function () {
    if (active.__mz_original) {
      void closeFor('detach')
    }

    const detached = arguments.length
      ? getImagesFromSelectors(arguments, isAttached)
      : images
    if (detached.length) {
      detached.forEach(image => {
        dispatch(image, 'detach')
        // Released images lose the zoom's listeners, so off() is not needed for images it
        // can no longer reach. A closing image keeps them for its `closed`.
        if (image !== active.__mz_original) {
          unlisten(image)
        }
      })
      images = images.filter(image => detached.indexOf(image) === -1)
      commit()
    }
    return zoom
  }

  const unlisten = (image: ZoomTarget) =>
    eventListeners.forEach(([type, listener, options]) =>
      image.removeEventListener(type, listener, options)
    )

  const capture = (options: boolean | AddEventListenerOptions) =>
    typeof options === 'boolean' ? options : !!options.capture

  const bindEvents =
    (add: boolean): EngineZoom['on'] =>
    (type, listener, options = {}) => {
      const eventType = `medium-zoom:${type}`
      const once = typeof options === 'object' && !!options.once
      // A filter is registered, so a listener hears only this zoom, even on an image another
      // zoom shares, as one recreated on the same image does.
      const registered = eventListeners.find(
        entry =>
          entry[0] === eventType &&
          entry[3] === listener &&
          capture(entry[2]) === capture(options)
      )
      const handler = registered
        ? registered[1]
        : (event: Event) => {
            if ((event as CustomEvent).detail.zoom === zoom) {
              // `once` applies to this zoom's events: the filter itself stays registered.
              if (once) {
                zoom.off(type, listener, options)
              }
              if (typeof listener === 'function') {
                listener.call(event.currentTarget, event)
              } else {
                listener.handleEvent(event)
              }
            }
          }
      // A detached image still closing keeps this zoom's listeners until it is closed.
      ;(active.__mz_original && !isAttached(active.__mz_original)
        ? images.concat(active.__mz_original)
        : images
      ).forEach(image =>
        image[add ? 'addEventListener' : 'removeEventListener'](
          eventType,
          handler,
          once ? { ...(options as object), once: false } : options
        )
      )
      if (!add) {
        eventListeners = eventListeners.filter(
          ([type, callback, registered]) =>
            !(
              type === eventType &&
              callback === handler &&
              capture(registered) === capture(options)
            )
        )
      } else if (!registered) {
        eventListeners.push([eventType, handler, options, listener])
      }
      return zoom
    }

  const updateGlobalEvents = (enabled: boolean) => {
    const method = enabled ? 'addEventListener' : 'removeEventListener'
    // The modal handles Escape through its native cancel event.
    if (!stage) {
      document[method]('keyup', handleKeyUp as EventListener)
    }
    document[method]('click', handleClick)
    document[method]('scroll', handleScroll)
    const touchOptions = { passive: true }
    ;['touchstart', 'touchend', 'touchcancel'].forEach(type =>
      document[method](type, handleTouch as EventListener, touchOptions)
    )
    // The zoom follows the window; the v1 presets close instead.
    window[method]('resize', handleResize)
  }

  const open = (options: ModalOpenOptions = {}): Promise<EngineZoom> => {
    const target = options.target
    let previous: Scene | undefined
    if (stage && active.__mz_original && !active.__mz_closing) {
      // Re-entrant requests wait until the open scene has its host and frames.
      if (!active.__mz_view || !active.__mz_frames) {
        return Promise.resolve().then(() => open(options))
      }
      if (target && target !== active.__mz_original) {
        previous = active
      }
    }
    const current: Scene = {}
    let stepping = false

    return new Promise<EngineZoom>((resolve, reject) => {
      if (
        !images.length ||
        (!previous && active.__mz_original) ||
        (target && !isAttached(target))
      ) {
        resolve(zoom)
        return
      }
      if (previous) {
        stepping =
          !!options.instant ||
          !!previous.__mz_cancelOpen ||
          Date.now() - previous.__mz_requested! < pause
        if (previous.__mz_release) {
          previous.__mz_release()
        }
        if (previous.__mz_cancelOpen) {
          previous.__mz_cancelOpen()
        }
        // Recheck the scene after cancellation because its callbacks can navigate or close synchronously.
        if (active !== previous || previous.__mz_closing) {
          resolve(zoom)
          return
        }
        clearTimeout(previous.__mz_scrollTimer)
        previous.__mz_original!.classList.remove('medium-zoom-image--hidden')
        current.__mz_view = previous.__mz_view
        current.__mz_view!.take(
          previous.__mz_frames!,
          previous.__mz_original!,
          stepping
        )
      }
      active = current
      current.__mz_requested = Date.now()

      let cancelTransition: (() => void) | void
      // High-resolution media that arrived mid-opening, held until the scene settles.
      let arrived: { media?: HTMLImageElement } | undefined
      let frame: number
      const fail = (error: unknown) => {
        reject(error)
        void close()
      }
      const finishOpening = (opened = false) => {
        if (!current.__mz_cancelOpen) {
          return
        }
        current.__mz_cancelOpen = null
        try {
          if (cancelTransition) {
            cancelTransition()
          }
        } catch (error) {
          opened = false
          fail(error)
        }
        cancelAnimationFrame(frame)
        resolve(zoom)
        if (opened) {
          document.body.classList.add('medium-zoom--opened')
          commit('open')
          dispatch(original, 'opened')
          if (arrived) {
            upgrade(arrived.media)
          }
        }
      }
      const settle = (error?: unknown) => {
        if (!current.__mz_cancelOpen) {
          return
        }
        cancelTransition = undefined
        if (error !== undefined) {
          fail(error)
        } else {
          finishOpening(true)
        }
      }
      current.__mz_cancelOpen = finishOpening
      const original = (current.__mz_original = target || images[0]!)
      current.__mz_viewportScale = visualViewport!.scale
      if (!previous) {
        updateGlobalEvents(true)
      }
      commit('opening')
      // A subscriber may have closed it already: then it never opened.
      if (!current.__mz_cancelOpen) {
        return
      }
      dispatch(original, 'open')
      if (!current.__mz_cancelOpen) {
        return
      }

      scrollTop = scrollY
      const primary = cloneImage(original as HTMLImageElement, stage)
      const frames = (current.__mz_frames = [primary])
      // Listen on the frame because mobile WebKit can fail to deliver its click to the document.
      primary.addEventListener('click', closeOnImage)
      // Before the frame is laid out: `will-change` makes it a containing block, which
      // would invalidate that layout.
      primary.classList.add('medium-zoom-image--opened')

      let host = document.body
      try {
        if (stage) {
          host = (current.__mz_view =
            current.__mz_view ||
            stage.mount({
              zoom,
              // Bound as a listener, it receives an event: that is a control.
              close: (reason, event) => void closeFor(reason, 'control', event),
              trigger: options.trigger,
            })).element
        }
        // Mounting the stage's content may have closed the zoom.
        if (!current.__mz_cancelOpen) {
          return
        }
        // A replaced scene keeps its backdrop, below the frames still on stage.
        if (!previous) {
          if (!zoomOptions.background) {
            overlay.style.background = pageBackground()
          }
          host.appendChild(overlay)
        }
        host.appendChild(primary)
        // The stage shows itself with the frame inside, so one layout covers both.
        if (stage) {
          current.__mz_view!.enter(primary)
        }
      } catch (error) {
        reject(error)
        finishOpening()
        if (current.__mz_view) {
          current.__mz_view.dispose()
        }
        primary.remove()
        active = {}
        updateGlobalEvents(false)
        commit('closed')
        return
      }
      if (!current.__mz_cancelOpen) {
        return
      }

      frame = requestAnimationFrame(() => {
        document.body.classList.add('medium-zoom--opened')
      })

      // A copy the browser loads again paints nothing yet: keep the page image until it can.
      const hide = () => {
        if (active === current && !current.__mz_closing) {
          original.classList.add('medium-zoom-image--hidden')
        }
      }
      if (primary.complete) {
        hide()
      } else {
        void primary.decode().then(hide, hide)
      }

      const fit = (content: Frame, fill?: boolean) => {
        const margin = zoomOptions.margin!
        const bounds = {
          width: document.documentElement.clientWidth - margin * 2,
          height: document.documentElement.clientHeight - margin * 2,
          left: margin,
          top: margin,
        }
        return fitImage(
          content,
          (measureViewport && measureViewport(bounds, zoomOptions)) || bounds,
          fill
        )
      }
      // Loaders return bare, detached images: give them the frame's presentation.
      const join = (media: HTMLImageElement) => {
        if (media.isConnected || !isImage(media)) {
          throw new TypeError('ready(): detached image')
        }
        media.style.cssText = primary.style.cssText
        // A loader may already have copied them, as loadHdImage does: add each class once.
        // An authored load handler may also have replaced the copied classes.
        media.classList.add(...primary.classList, 'medium-zoom-image--opened')
        media.addEventListener('click', closeOnImage)
        host.appendChild(media)
        frames.push(media)
      }
      let prepared = false
      let filled: boolean | undefined
      // `fill` presents the frame at the size its high-resolution image will have, so that
      // image later appears in place instead of growing out of a smaller preview.
      const present = (media?: HTMLImageElement, fill?: boolean) => {
        if (prepared || !current.__mz_cancelOpen) {
          return
        }
        prepared = true
        filled = fill
        try {
          if (media) {
            join(media)
          }
          const transform = fit(media || primary, fill)
          if (stage) {
            cancelTransition = current.__mz_view!.present(
              frames,
              transform,
              settle
            )
          }
          if (!cancelTransition) {
            if (transform) {
              frames.forEach(frame => {
                frame.style.transform = transform
              })
            }
            cancelTransition = waitForTransition(primary, settle)
          }
        } catch (error) {
          fail(error)
        }
      }

      const upgrade = (media?: HTMLImageElement) => {
        if (active !== current || current.__mz_closing) {
          return
        }
        const content = media || primary
        if (media) {
          join(media)
          if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
            media.animate({ opacity: [0, 1] }, 200)
          }
        }
        // Fitting measures the untransformed box, including the individual transform
        // properties a gesture may be zooming with: clear them without a transition, so the
        // frames only move if the final fit differs from the preview's.
        const { style } = content
        const shown = [style.transform, style.translate, style.scale]
        style.setProperty('transition', 'none', 'important')
        style.transform = style.translate = style.scale = ''
        // Keep the size already shown: a smaller high-resolution image fills the preview's
        // box rather than shrinking it.
        const transform = fit(content, filled)
        ;[style.transform, style.translate, style.scale] = shown
        content.getBoundingClientRect()
        style.removeProperty('transition')
        // The scene is already presented: this only hands the new frames to the stage.
        if (media && stage) {
          current.__mz_view!.present(frames, transform, () => {})
        }
        if (transform) {
          frames.forEach(frame => {
            frame.style.transform = transform
          })
        }
      }

      // Refits without a transition from where the image is now, since the page may have
      // reflowed, so closing zooms back to the right place. A gesture's zoom is dropped.
      current.__mz_refit = () => {
        if (prepared) {
          const placement = framePlacement(original, stage)
          frames.forEach(({ style }) => {
            style.setProperty('transition', 'none', 'important')
            style.translate = style.scale = ''
            Object.assign(style, placement)
          })
          const transform = fit(primary, filled) || ''
          frames.forEach(({ style }) => (style.transform = transform))
          primary.getBoundingClientRect()
          frames.forEach(({ style }) => style.removeProperty('transition'))
        }
      }

      try {
        if (loader) {
          // The preview is presented at once and sharpened in place once the scene has settled.
          const show = (media?: HTMLImageElement) => {
            try {
              if (!prepared) {
                // Answered synchronously, as when there is nothing to load: present it directly.
                present(media)
              } else if (current.__mz_cancelOpen) {
                arrived = { media }
              } else {
                upgrade(media)
              }
            } catch {
              void close()
            }
          }
          // Media arriving after the frame is presented is decoded first, so it never shows
          // blank or drops a frame on screen.
          const ready = (media?: HTMLImageElement) =>
            prepared && media
              ? void media
                  .decode()
                  .catch(() => {})
                  .then(() => show(media))
              : show(media)
          let cancel: (() => void) | void
          const load = () => {
            cancel = loader(
              { original: original as HTMLImageElement, clone: primary },
              ready
            )
          }
          // Stepping loads only after a pause, so images passed on the way are never downloaded.
          let timer: ReturnType<typeof setTimeout> | undefined
          if (stepping) {
            timer = setTimeout(() => {
              try {
                load()
              } catch {
                void close()
              }
            }, pause)
          } else {
            load()
          }
          present(undefined, true)
          current.__mz_release = () => {
            clearTimeout(timer)
            if (cancel) {
              cancel()
            }
          }
        } else {
          present()
        }
      } catch (error) {
        fail(error)
      }
    })
  }

  let closing: Promise<EngineZoom> | undefined
  const close = () => {
    if (closing) {
      return closing
    }
    const promise = new Promise<EngineZoom>((resolve, reject) => {
      const current = active
      const original = current.__mz_original
      const frames = current.__mz_frames || []
      const primary = frames[0]
      if (!original || current.__mz_closing) {
        resolve(zoom)
        return
      }

      current.__mz_closing = true
      if (current.__mz_release) {
        current.__mz_release()
      }
      if (current.__mz_cancelOpen) {
        current.__mz_cancelOpen()
      }
      clearTimeout(current.__mz_scrollTimer)
      const finishClosing = () => {
        original.classList.remove('medium-zoom-image--hidden')
        frames.forEach(frame => frame.remove())
        overlay.remove()
        active = {}
        closing = undefined
        updateGlobalEvents(false)
        commit('closed')
        try {
          if (current.__mz_view) {
            current.__mz_view.dispose()
          }
          resolve(zoom)
        } catch (error) {
          reject(error)
        } finally {
          dispatch(original, 'closed', current)
          if (!isAttached(original)) {
            unlisten(original)
          }
        }
      }

      // Set up completion before firing events because listeners can start another operation synchronously.
      if (primary) {
        waitForTransition(primary, finishClosing)
      }
      document.body.classList.remove('medium-zoom--opened')
      frames.forEach(frame => {
        frame.style.transform = ''
      })
      commit('closing')
      dispatch(original, 'close', current)
      if (!primary) {
        finishClosing()
      }
    })
    if (active.__mz_closing) {
      closing = promise
    }
    return promise
  }

  // Opening first closes the group's shown zoom and waits for it.
  let waiting: Promise<EngineZoom> | undefined
  let ticket = 0
  const release = () => {
    if (group && status === 'closed' && group.__mz_shown === zoom) {
      group.__mz_shown = undefined
    }
  }
  const claim = (options?: ModalOpenOptions) => {
    if (group) {
      group.__mz_shown = zoom
    }
    const opening = open(options)
    void opening.then(release, release)
    return opening
  }
  let latest: ModalOpenOptions | undefined
  // Whether this zoom waits for its group with a request nothing has superseded.
  const queued = () => !!waiting && ticket === group!.__mz_ticket
  const request = (options?: ModalOpenOptions): Promise<EngineZoom> => {
    const target = options && options.target
    // A request that cannot open leaves the group alone.
    if (!images.length || (target && !isAttached(target))) {
      return Promise.resolve(zoom)
    }
    latest = options
    const shown = group && group.__mz_shown
    if (queued()) {
      return waiting!
    }
    if (!shown || shown === zoom) {
      // Opening while nothing is shown supersedes any request still waiting.
      if (group && !shown) {
        group.__mz_ticket++
      }
      return claim(options)
    }
    // A newer request, from any zoom of the group, supersedes this one while it waits; a
    // repeated one from this zoom updates what it opens.
    const own = (ticket = ++group!.__mz_ticket)
    const finish = (): Promise<EngineZoom> | EngineZoom => {
      if (waiting === pending) {
        waiting = undefined
      }
      return own === group!.__mz_ticket ? request(latest) : zoom
    }
    const pending = shown.close({ reason: 'group' }).then(finish, finish)
    return (waiting = pending)
  }

  /** Records why the next close happens, unless one is under way. */
  const closeFor = (
    reason?: ZoomCloseReason | ZoomCloseOptions | Event,
    fallback: ZoomCloseReason = 'api',
    event?: Event
  ) => {
    // Closing cancels an opening still waiting for another zoom of the group.
    if (queued()) {
      group!.__mz_ticket++
    }
    if (active.__mz_original && !active.__mz_closing) {
      // `reason` is a reason, close options, or, bound as a listener, the event.
      const options = (
        typeof reason === 'string'
          ? { reason, event }
          : reason && (reason as Event).type
            ? { event: reason }
            : reason || {}
      ) as ZoomCloseOptions
      active.__mz_reason = options.reason || fallback
      active.__mz_event = options.event
    }
    return close()
  }
  const closeOnImage = (event: Event) =>
    void closeFor('image-press', 'api', event)

  let images: ZoomTarget[] = []
  let eventListeners: [
    type: string,
    /** The filter registered on the images for `original`. */
    listener: EventListener,
    options: boolean | AddEventListenerOptions,
    original: EventListenerOrEventListenerObject,
  ][] = []
  let scrollTop = 0
  let zoomOptions: CoreZoomOptions = {
    margin: 0,
    background: undefined,
    scrollOffset: 40,
    ...options,
  }
  let active: Scene = {}
  const overlay = createOverlay(zoomOptions.background)

  const zoom: EngineZoom = {
    open: request,
    close: options => closeFor(options),
    toggle: options =>
      queued() || active.__mz_original ? closeFor() : request(options),
    update,
    // Strategies and the group carry over; images and the signal do not.
    clone: options =>
      createEngine(
        undefined,
        { ...zoomOptions, ...options },
        loader,
        measureViewport,
        stage,
        group
      ) as never,
    attach,
    detach,
    on: bindEvents(true),
    off: bindEvents(false),
    // Copies: options and images change only through the zoom.
    getOptions: () => ({ ...zoomOptions }),
    getImages: () => images.slice() as HTMLElement[],
    getZoomedImage: () => (active.__mz_original || null) as HTMLElement | null,
    getSnapshot: () => state!,
    subscribe(listener) {
      subscribers.add(listener)
      return () => subscribers.delete(listener)
    },
    preload(target) {
      if (loader && isAttached(target)) {
        loader({ original: target, clone: target } as ZoomLoadContext, () => {})
      }
    },
  }

  attach(selector as ZoomSelector)
  // Attaching already committed the first state.
  if (!state) {
    commit()
  }

  return zoom
}
