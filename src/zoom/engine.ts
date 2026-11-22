import {
  assign,
  createCustomEvent,
  getPromise,
  getScrollY,
  isEscape,
} from '#platform'

import {
  createOverlay,
  getImagesFromSelectors,
  pageBackground,
  removeNode,
} from './dom'
import { cloneImage, fitImage, type Frame, type ZoomTarget } from './frame'
import type { ZoomBounds } from './geometry'
import { waitForTransition } from './transition'

/** The images to zoom: a CSS selector, an element, a list of elements, or `null` for none. */
export type ZoomSelector =
  string | HTMLElement | HTMLElement[] | NodeList | null

/** Options every zoom accepts, in every entry. Change them later with `zoom.update()`. */
export interface CoreZoomOptions {
  /**
   * The space outside the zoomed image.
   *
   * @default 0
   */
  margin?: number

  /**
   * The background of the overlay.
   *
   * @default the page's background color when the zoom opens; '#fff' in the presets
   */
  background?: string

  /**
   * The number of pixels to scroll to close the zoom.
   *
   * @default 40
   */
  scrollOffset?: number
}

/** Options for `open()` and `toggle()`. */
export interface ZoomOpenOptions {
  /**
   * The attached image to zoom. An image that is not attached is ignored.
   *
   * @default the first attached image
   */
  target?: HTMLElement
}

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
 * A zoom instance: the images it manages, its options and its open/close lifecycle.
 * Events are dispatched on the images as `medium-zoom:<type>` (`open`, `opened`, `close`,
 * `closed`, `attach`, `detach`, `update`) with `event.detail.zoom`.
 */
export interface ZoomInstance<
  Options extends CoreZoomOptions = CoreZoomOptions,
> {
  /**
   * Opens the zoom. Does nothing while it is already open.
   *
   * @param options - Which image to open.
   * @returns A promise resolving with the zoom once the opening transition ends.
   */
  open(options?: ZoomOpenOptions): Promise<this>

  /**
   * Closes the zoom. Does nothing while it is already closed.
   *
   * @returns A promise resolving with the zoom once the closing transition ends.
   */
  close(): Promise<this>

  /**
   * Closes the zoom when it is open, opens it otherwise.
   *
   * @param options - Which image to open.
   * @returns A promise resolving with the zoom once the transition ends.
   */
  toggle(options?: ZoomOpenOptions): Promise<this>

  /**
   * Attaches images to the zoom. Images already attached are skipped; non-images are ignored.
   *
   * @param selectors - The images to attach.
   * @returns The zoom.
   */
  attach(...selectors: ZoomSelector[]): this

  /**
   * Releases images from the zoom, closing it first when open. Without selectors, releases all.
   *
   * @param selectors - The images to release.
   * @returns The zoom.
   */
  detach(...selectors: ZoomSelector[]): this

  /**
   * Merges options into the current ones.
   *
   * @param options - The options to change.
   * @returns The zoom.
   */
  update(options: Options): this

  /**
   * Creates a new zoom with the current options merged with `options`, and no images.
   *
   * @param options - The options to override.
   * @returns The new zoom.
   */
  clone(options?: Options): this

  /**
   * Registers a `medium-zoom:<type>` listener on every image, current and future.
   *
   * @param type - The event type without its prefix, such as `opened`.
   * @param listener - The function to execute when the event is triggered.
   * @param options - The event listener options (same as [`addEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Parameters))
   * @returns The zoom.
   */
  on(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): this

  /**
   * Unregisters a listener registered with `on()`.
   *
   * @param type - The event type without its prefix, such as `opened`.
   * @param listener - The function to remove from the event target.
   * @param options - The event listener options (same as [`removeEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#Parameters))
   * @returns The zoom.
   */
  off(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): this

  /**
   * Returns the current options, defaults included.
   *
   * @returns The zoom options.
   */
  getOptions(): Options

  /**
   * Returns the attached images, in attach order.
   *
   * @returns The zoom images.
   */
  getImages(): HTMLElement[]

  /**
   * Returns the open image.
   *
   * @returns The current zoomed image, or `null` while the zoom is closed.
   */
  getZoomedImage(): HTMLElement | null
}

/**
 * Why a zoom closed: `api` for `close()` without a reason, `control` for an application
 * control such as a close button, `pointer` for a click on the image or backdrop, `escape`,
 * `form` for a `method="dialog"` form, `gesture`, `scroll`, `detach` when images were
 * detached while it was open, and `group` when another zoom of its group opened.
 */
export type ZoomCloseReason =
  | 'api'
  | 'control'
  | 'pointer'
  | 'escape'
  | 'form'
  | 'gesture'
  | 'scroll'
  | 'detach'
  | 'group'

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
  close: { readonly zoom: ZoomInstance; readonly reason: ZoomCloseReason }
  closed: { readonly zoom: ZoomInstance; readonly reason: ZoomCloseReason }
  attach: { readonly zoom: ZoomInstance }
  detach: { readonly zoom: ZoomInstance }
  update: { readonly zoom: ZoomInstance }
}
/** A zoom event, dispatched on the image it concerns. */
export type ZoomEvent<Type extends keyof ZoomEventMap = keyof ZoomEventMap> =
  CustomEvent<ZoomEventMap[Type]>

/**
 * Creates a zoom on the images matching `selector`. The selector can be omitted:
 * `factory(options)` creates a zoom without images.
 */
export interface ZoomFactory<
  Options extends CoreZoomOptions = CoreZoomOptions,
  Instance extends ZoomInstance<Options> = ZoomInstance<Options>,
> {
  /**
   * @param selector - The images to attach.
   * @param options - The zoom options.
   */
  (selector?: ZoomSelector, options?: Options): Instance
  /** @param options - The zoom options. */
  (options?: Options): Instance
}

export type Cleanup = () => void
export type LegacyContent = (disposed?: boolean) => void
export interface Scene {
  __mz_view?: StageView
  __mz_closeContent?: LegacyContent | void
  __mz_original?: ZoomTarget
  __mz_frames?: Frame[]
  __mz_closing?: boolean
  __mz_cancelOpen?: ((opened?: boolean) => void) | null
  __mz_viewportScale?: number
  __mz_isPinching?: boolean
  __mz_scrollTimer?: ReturnType<typeof setTimeout>
  __mz_refit?: () => void
  __mz_release?: () => void
  __mz_requested?: number
  __mz_reason?: ZoomCloseReason
}

/** What a loader works from when a zoom opens. */
export interface ZoomLoadContext {
  /** The attached image the zoom opened from. */
  readonly original: HTMLImageElement
  /**
   * The frame on screen, a clone of `original`. Composed zooms present it before loading;
   * the presets fit it once `ready()` is called.
   */
  readonly clone: HTMLImageElement
}
/**
 * Supplies a higher-resolution image for an opening zoom. Call `ready()` with a detached,
 * loaded image to show it over the frame, or without one to keep the frame. Return a cleanup
 * that cancels loading; the zoom calls it once the image is no longer needed: when the
 * opening ends or is cancelled, or when a stepping scene is replaced or closed.
 */
export type ZoomLoader = (
  context: ZoomLoadContext,
  ready: (image?: HTMLImageElement) => void
) => Cleanup | void
/**
 * Measures where the zoomed image fits, at positioning time. Receives the window bounds
 * minus `margin` and returns the bounds to fit into, in viewport coordinates.
 */
export type ZoomViewport = (
  bounds: ZoomBounds,
  options: Readonly<CoreZoomOptions>
) => ZoomBounds
export interface LegacyAdapter<Options extends CoreZoomOptions> {
  defaults: Partial<Options>
  update: (options: Options, previous: Options) => void
  content: (
    frame: ZoomTarget,
    host: HTMLElement,
    options: Options
  ) => LegacyContent | void
}

export interface Stage {
  mount(context: {
    readonly zoom: ZoomInstance
    /** Closes the zoom; the reason defaults to `control`. */
    close: (reason?: ZoomCloseReason) => void
    readonly trigger?: HTMLElement
  }): StageView
}
export interface StageView {
  readonly element: HTMLElement
  /**
   * Another scene replaces the one whose frames and source are given: keep them on stage.
   * `stepping` is true when the user moves on without pausing, as while holding an arrow key.
   */
  take(frames: readonly Frame[], source: ZoomTarget, stepping: boolean): void
  /** A frame joined the host and is not positioned yet. */
  enter(frame: Frame): void
  /**
   * Frames are fitted. Return a cancellation when the stage presents them itself and
   * calls `done`; return nothing for the engine's own zoom transition.
   */
  present(
    frames: readonly Frame[],
    transform: string | null,
    done: (error?: unknown) => void
  ): Cleanup | void
  dispose(): void
}

/** The zooms of a group open one at a time; `ZoomGroup` is its public, opaque type. */
export interface Group {
  /** The zoom that claimed the group: opening, open or closing. */
  __mz_shown?: ZoomInstance
  /** Bumped by every request that has to wait, so only the latest one opens. */
  __mz_ticket: number
}

/** Fixed presets replace this flag at build time so the bundler can remove strategy checks. */
declare const __PRESET__: boolean

// Moving on within this many milliseconds of a scene is stepping, as while holding an arrow key.
const pause = 300
type Preload = (target: HTMLElement) => void
export const createEngine = <Options extends CoreZoomOptions>(
  loader?: ZoomLoader,
  measureViewport?: ZoomViewport,
  stageOption?: Stage,
  legacy?: LegacyAdapter<Options>,
  adoptMedia?: (frame: Frame, media: HTMLImageElement) => void,
  group?: Group
): ZoomFactory<Options> => {
  const stage = __PRESET__ ? undefined : stageOption
  const mediumZoom = (
    selector?: ZoomSelector | Options,
    options = {} as Options
  ) => {
    const Promise = getPromise()

    const _dispatchEvent = (image: ZoomTarget, type: string) => {
      image.dispatchEvent(
        createCustomEvent(
          `medium-zoom:${type}`,
          // Only `close` and `closed` start with a "c" and carry the reason.
          __PRESET__
            ? { zoom }
            : { zoom, reason: type[0] === 'c' ? reported : undefined }
        )
      )
    }

    // Composed zooms keep a frozen state for subscribers and report why they close; the
    // presets do neither. `requested` is the reason given to the next close, `reported` the
    // one carried by the close event being dispatched.
    let requested: ZoomCloseReason | undefined
    let reported: ZoomCloseReason | undefined
    let status: ZoomStatus = 'closed'
    let state: ZoomState
    const subscribers = __PRESET__ ? undefined : new Set<() => void>()
    const commit = (next = status) => {
      status = next
      release()
      state = Object.freeze({
        status,
        image: (active.__mz_original || null) as HTMLElement | null,
        images: images as readonly HTMLElement[],
      })
      // A failing subscriber must not interrupt the lifecycle that notifies it.
      subscribers!.forEach(listener => {
        try {
          listener()
        } catch (error) {
          reportError(error)
        }
      })
    }

    const isAttached = (image: ZoomTarget) => images.indexOf(image) !== -1

    const handleClick = (event: Event) => {
      const target = event.target as HTMLImageElement
      if (__PRESET__ && isAttached(target)) {
        void toggle({ target })
      } else if (target === overlay) {
        if (__PRESET__) {
          _close()
        } else {
          closeOnPointer()
        }
      }
    }

    const _handleScroll = () => {
      if (!active.__mz_original) {
        return
      }

      const currentScroll = getScrollY()

      // Pinching and panning a magnified page must keep the full-size image open.
      if (
        active.__mz_isPinching ||
        (window.visualViewport &&
          window.visualViewport.scale > active.__mz_viewportScale!)
      ) {
        scrollTop = currentScroll
        clearTimeout(active.__mz_scrollTimer)
        active.__mz_scrollTimer = undefined
        return
      }

      if (active.__mz_cancelOpen || active.__mz_closing) {
        return
      }

      if (
        Math.abs(scrollTop - currentScroll) > zoomOptions.scrollOffset! &&
        !active.__mz_scrollTimer
      ) {
        active.__mz_scrollTimer = setTimeout(
          __PRESET__ ? _close : closeOnScroll,
          150
        )
      }
    }

    const _handleTouch = (event: TouchEvent) => {
      if (event.touches.length >= 2) {
        active.__mz_isPinching = true
      }
      if (active.__mz_isPinching) {
        _handleScroll()
      }

      // Keep protecting the gesture when one finger lifts before the other.
      if (event.touches.length === 0) {
        active.__mz_isPinching = false
      }
    }

    const _handleKeyUp = (event: KeyboardEvent) => {
      if (isEscape(event)) {
        void (__PRESET__ ? close() : closeFor('escape'))
      }
    }

    const update = (options = {} as Options) => {
      if (options.background) {
        overlay.style.background = options.background
      }

      if (__PRESET__) {
        // FIXME(v2): Normalize a copy so update() accepts frozen options.
        legacy!.update(options, zoomOptions)
      }

      zoomOptions = assign({}, zoomOptions, options)

      images.forEach(image => {
        _dispatchEvent(image, 'update')
      })

      return zoom
    }

    const clone = (options?: Options) =>
      mediumZoom(assign({}, zoomOptions, options))

    const attach: ZoomInstance<Options>['attach'] = function () {
      const newImages = getImagesFromSelectors(
        arguments,
        image => !isAttached(image)
      )

      if (__PRESET__ && !images.length && newImages.length) {
        document.addEventListener('click', handleClick)
      }
      images = images.concat(newImages)
      if (!__PRESET__) {
        Object.freeze(images)
      }
      newImages.forEach(image => {
        if (__PRESET__) {
          image.classList.add('medium-zoom-image')
        }
        eventListeners.forEach(([type, listener, options]) => {
          image.addEventListener(type, listener, options)
        })
      })

      newImages.forEach(image => _dispatchEvent(image, 'attach'))
      if (!__PRESET__ && newImages.length) {
        commit()
      }
      return zoom
    }

    const detach: ZoomInstance<Options>['detach'] = function () {
      if (active.__mz_original) {
        void (__PRESET__ ? close() : closeFor('detach'))
      }

      const detached = arguments.length
        ? getImagesFromSelectors(arguments, isAttached)
        : images
      detached.forEach(image => {
        if (__PRESET__) {
          image.classList.remove('medium-zoom-image')
        }
        _dispatchEvent(image, 'detach')
      })
      images = images.filter(image => detached.indexOf(image) === -1)
      if (!__PRESET__) {
        Object.freeze(images)
      }
      if (__PRESET__ && !images.length) {
        document.removeEventListener('click', handleClick)
      }
      if (!__PRESET__ && detached.length) {
        commit()
      }
      return zoom
    }

    const capture = (options: boolean | AddEventListenerOptions) =>
      typeof options === 'boolean' ? options : !!options.capture

    const bindEvents =
      (add: boolean): ZoomInstance<Options>['on'] =>
      (type, listener, options = {}) => {
        const eventType = `medium-zoom:${type}`
        const once =
          !__PRESET__ && typeof options === 'object' && !!options.once
        // Composed zooms register a filter, so a listener hears only this zoom, even on an
        // image another zoom shares, as one recreated on the same image does.
        const registered =
          !__PRESET__ &&
          eventListeners.find(
            entry =>
              entry[0] === eventType &&
              entry[3] === listener &&
              capture(entry[2]) === capture(options)
          )
        const filter = registered
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
        const handler = __PRESET__ ? listener : filter
        images.forEach(image =>
          image[add ? 'addEventListener' : 'removeEventListener'](
            eventType,
            __PRESET__ ? listener : handler,
            __PRESET__ || !once
              ? options
              : { ...(options as object), once: false }
          )
        )
        if (add) {
          if (__PRESET__) {
            eventListeners.push([eventType, listener, options])
          } else if (!registered) {
            eventListeners.push([eventType, handler, options, listener])
          }
        } else {
          eventListeners = eventListeners.filter(
            ([type, callback, registered]) =>
              !(
                type === eventType &&
                callback === (__PRESET__ ? listener : handler) &&
                capture(registered) === capture(options)
              )
          )
        }
        return zoom
      }

    const _updateGlobalEvents = (enabled: boolean) => {
      const method = enabled ? 'addEventListener' : 'removeEventListener'
      // The modal handles Escape through its native cancel event.
      if (!stage) {
        document[method]('keyup', _handleKeyUp as EventListener)
      }
      if (!__PRESET__) {
        document[method]('click', handleClick)
      }
      document[method]('scroll', _handleScroll)
      const touchOptions = { passive: true }
      ;['touchstart', 'touchend', 'touchcancel'].forEach(type =>
        document[method](type, _handleTouch as EventListener, touchOptions)
      )
      // Composed zooms follow the window; the presets close, as v1 did.
      window[method]('resize', __PRESET__ ? _close : _refit)
    }

    const open = (
      options: ModalOpenOptions = {}
    ): Promise<ZoomInstance<Options>> => {
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

      return new Promise<ZoomInstance<Options>>((resolve, reject) => {
        if (
          !images.length ||
          (!previous && active.__mz_original) ||
          (target && !isAttached(target))
        ) {
          resolve(zoom)
          return
        }
        if (previous) {
          if (!__PRESET__) {
            stepping =
              !!options.instant ||
              !!previous.__mz_cancelOpen ||
              Date.now() - previous.__mz_requested! < pause
            if (previous.__mz_release) {
              previous.__mz_release()
            }
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
        if (!__PRESET__) {
          current.__mz_requested = Date.now()
        }

        let cancelTransition: (() => void) | void
        let cancelImage: (() => void) | void
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
            if (cancelImage) {
              cancelImage()
            }
          } catch (error) {
            reject(error)
            opened = false
            void close()
          }
          window.cancelAnimationFrame(frame)
          resolve(zoom)
          if (opened) {
            document.body.classList.add('medium-zoom--opened')
            if (!__PRESET__) {
              commit('open')
            }
            _dispatchEvent(current.__mz_original!, 'opened')
            if (!__PRESET__ && arrived) {
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
        current.__mz_original = target || images[0]!
        current.__mz_viewportScale = window.visualViewport
          ? window.visualViewport.scale
          : 1
        _updateGlobalEvents(true)
        if (!__PRESET__) {
          commit('opening')
          // A subscriber may have closed it already: then it never opened.
          if (!current.__mz_cancelOpen) {
            return
          }
        }
        _dispatchEvent(current.__mz_original!, 'open')
        if (!current.__mz_cancelOpen) {
          return
        }

        scrollTop = getScrollY()
        const primary = cloneImage(
          current.__mz_original as HTMLImageElement,
          stage
        )
        current.__mz_frames = [primary]
        // Listen on the frame because mobile WebKit can fail to deliver its click to the document.
        primary.addEventListener('click', __PRESET__ ? _close : closeOnPointer)

        try {
          if (stage) {
            current.__mz_view =
              current.__mz_view ||
              stage.mount({
                zoom,
                // Bound as a listener, it receives an event: that is a control.
                close: reason => void closeFor(reason, 'control'),
                trigger: options.trigger,
              })
            current.__mz_view.enter(primary)
          }
        } catch (error) {
          reject(error)
          finishOpening()
          if (current.__mz_view) {
            current.__mz_view.dispose()
          }
          removeNode(primary)
          active = {}
          _updateGlobalEvents(false)
          if (!__PRESET__) {
            commit('closed')
          }
          return
        }
        if (!current.__mz_cancelOpen) {
          return
        }
        const host = stage ? current.__mz_view!.element : document.body
        // A replaced scene keeps its backdrop, below the frames still on stage.
        if (!previous) {
          if (!__PRESET__ && !zoomOptions.background) {
            overlay.style.background = pageBackground()
          }
          host.appendChild(overlay)
        }
        try {
          if (__PRESET__) {
            current.__mz_closeContent = legacy!.content(
              primary,
              host,
              zoomOptions
            )
          }
        } catch (error) {
          fail(error)
          return
        }
        if (!current.__mz_cancelOpen) {
          return
        }

        host.appendChild(primary)

        frame = window.requestAnimationFrame(() => {
          document.body.classList.add('medium-zoom--opened')
        })

        if (__PRESET__ || primary.complete) {
          current.__mz_original.classList.add('medium-zoom-image--hidden')
        } else {
          // A copy the browser loads again paints nothing yet: keep the page image until it can.
          const hide = () => {
            if (active === current && !current.__mz_closing) {
              current.__mz_original!.classList.add('medium-zoom-image--hidden')
            }
          }
          void primary.decode().then(hide, hide)
        }
        primary.classList.add('medium-zoom-image--opened')

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
            __PRESET__
              ? measureViewport!(bounds, zoomOptions)
              : (measureViewport && measureViewport(bounds, zoomOptions)) ||
                  bounds,
            fill
          )
        }
        const join = (media: HTMLImageElement) => {
          // The preset's own loader already copied the frame's presentation.
          if (!__PRESET__ && adoptMedia) {
            adoptMedia(primary, media)
          }
          // An authored load handler may have replaced the copied classes.
          media.classList.add('medium-zoom-image--opened')
          media.addEventListener('click', __PRESET__ ? _close : closeOnPointer)
          host.appendChild(media)
          current.__mz_frames!.push(media)
        }
        let prepared = false
        let filled: boolean | undefined
        // `fill` presents the frame at the size its high-resolution image will have, so that
        // image later appears in place instead of growing out of a smaller preview.
        const animate = (media?: HTMLImageElement, fill?: boolean) => {
          if ((!__PRESET__ && prepared) || !current.__mz_cancelOpen) {
            return
          }
          prepared = true
          filled = fill
          try {
            const frames = current.__mz_frames!
            const content = media || primary
            if (media) {
              join(media)
            }
            const transform = fit(content, !__PRESET__ && fill)
            if (stage) {
              cancelTransition = current.__mz_view!.present(
                frames,
                transform,
                settle
              )
            }
            if (__PRESET__ || !cancelTransition) {
              if (transform) {
                frames.forEach(frame => {
                  frame.style.transform = transform
                })
              }
              cancelTransition = waitForTransition(
                primary,
                __PRESET__ ? () => finishOpening(true) : settle
              )
            }
          } catch (error) {
            fail(error)
          }
        }

        const upgrade = (media?: HTMLImageElement) => {
          if (active !== current || current.__mz_closing) {
            return
          }
          const frames = current.__mz_frames!
          const content = media || primary
          if (media) {
            join(media)
            media.animate({ opacity: [0, 1] }, 200)
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
          content.style.removeProperty('transition')
          // The scene is already presented: this only hands the new frames to the stage.
          if (media) {
            current.__mz_view!.present(frames, transform, () => {})
          }
          if (transform) {
            frames.forEach(frame => {
              frame.style.transform = transform
            })
          }
        }

        if (!__PRESET__) {
          // Refits without a transition from where the image is now, since the page may have
          // reflowed, so closing zooms back to the right place. A gesture's zoom is dropped.
          current.__mz_refit = () => {
            if (prepared) {
              const { left, top, width, height } = cloneImage(
                current.__mz_original as HTMLImageElement,
                stage
              ).style
              const frames = current.__mz_frames!
              frames.forEach(({ style }) => {
                style.setProperty('transition', 'none', 'important')
                style.translate = style.scale = ''
                assign(style, { left, top, width, height, transform: '' })
              })
              const transform = fit(primary, filled) || ''
              frames.forEach(({ style }) => {
                style.transform = transform
                primary.getBoundingClientRect()
                style.removeProperty('transition')
              })
            }
          }
        }

        try {
          if (!__PRESET__ && loader) {
            // Composed zooms never wait for high resolution: they present the preview at once
            // and sharpen it in place once the scene has settled.
            const show = (media?: HTMLImageElement) => {
              try {
                if (!prepared) {
                  // Answered synchronously, as when there is nothing to load: present it directly.
                  animate(media)
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
                {
                  original: current.__mz_original as HTMLImageElement,
                  clone: primary,
                },
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
            if (!prepared) {
              animate(undefined, true)
            }
            current.__mz_release = () => {
              clearTimeout(timer)
              if (cancel) {
                cancel()
              }
            }
          } else if (__PRESET__) {
            cancelImage = loader!(
              {
                original: current.__mz_original as HTMLImageElement,
                clone: primary,
              },
              animate
            )
            if (!current.__mz_cancelOpen && cancelImage) {
              cancelImage()
            }
          } else {
            animate()
          }
        } catch (error) {
          fail(error)
        }
      })
    }

    let closing: Promise<ZoomInstance<Options>> | undefined
    const close = () => {
      if (closing) {
        return closing
      }
      const promise = new Promise<ZoomInstance<Options>>((resolve, reject) => {
        const current = active
        const frames = current.__mz_frames || []
        const primary = frames[0]
        if (!current.__mz_original || current.__mz_closing) {
          resolve(zoom)
          return
        }

        current.__mz_closing = true
        if (!__PRESET__) {
          current.__mz_reason = requested || 'api'
          requested = undefined
          if (current.__mz_release) {
            current.__mz_release()
          }
        }
        if (current.__mz_cancelOpen) {
          current.__mz_cancelOpen()
        }
        clearTimeout(current.__mz_scrollTimer)
        const finishClosing = () => {
          current.__mz_original!.classList.remove('medium-zoom-image--hidden')
          frames.forEach(removeNode)
          removeNode(overlay)
          const view = __PRESET__ ? undefined : current.__mz_view
          active = {}
          closing = undefined
          _updateGlobalEvents(false)
          if (!__PRESET__) {
            commit('closed')
          }
          try {
            if (__PRESET__ && current.__mz_closeContent) {
              current.__mz_closeContent(true)
            } else if (view) {
              view.dispose()
            }
            resolve(zoom)
          } catch (error) {
            reject(error)
          } finally {
            if (!__PRESET__) {
              reported = current.__mz_reason
            }
            _dispatchEvent(current.__mz_original!, 'closed')
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
        try {
          if (__PRESET__ && current.__mz_closeContent) {
            current.__mz_closeContent()
          }
        } catch (error) {
          reject(error)
        }
        if (!__PRESET__) {
          commit('closing')
          reported = current.__mz_reason
        }
        _dispatchEvent(current.__mz_original!, 'close')
        if (!primary) {
          finishClosing()
        }
      })
      if (active.__mz_closing) {
        closing = promise
      }
      return promise
    }

    const toggle = (options?: ModalOpenOptions) => {
      if (active.__mz_original) {
        return close()
      }

      return open(options)
    }

    // Composed zooms only: opening first closes the group's shown zoom and waits for it.
    let waiting: Promise<ZoomInstance<Options>> | undefined
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
    const request = (
      options?: ModalOpenOptions
    ): Promise<ZoomInstance<Options>> => {
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
      const finish = ():
        Promise<ZoomInstance<Options>> | ZoomInstance<Options> => {
        if (waiting === pending) {
          waiting = undefined
        }
        return own === group!.__mz_ticket ? request(latest) : zoom
      }
      const pending = (
        shown.close as (reason: ZoomCloseReason) => Promise<unknown>
      )('group').then(finish, finish)
      return (waiting = pending)
    }

    // Composed zooms hand out copies: their own options and images change only through the zoom.
    const getOptions = () =>
      __PRESET__ ? zoomOptions : assign({}, zoomOptions)

    const getImages = () => (__PRESET__ ? images : images.slice())

    const getZoomedImage = () => active.__mz_original || null

    let images: ZoomTarget[] = []
    let eventListeners: [
      type: string,
      listener: EventListenerOrEventListenerObject,
      options: boolean | AddEventListenerOptions,
      /** The listener given to `on()`, which composed zooms register a filter for. */
      original?: EventListenerOrEventListenerObject,
    ][] = []
    let scrollTop = 0
    let zoomOptions: Options = options
    let active: Scene = {}

    const zoom: ZoomInstance<Options> = {
      open,
      close,
      toggle,
      update,
      clone,
      attach,
      detach,
      on: bindEvents(true),
      off: bindEvents(false),
      getOptions,
      getImages: getImages as ZoomInstance<Options>['getImages'],
      getZoomedImage: getZoomedImage as ZoomInstance<Options>['getZoomedImage'],
    }

    const _close = () => {
      void close()
    }
    // Composed zooms only: records why the next close happens, unless one is under way.
    const closeFor = (reason?: unknown, fallback: ZoomCloseReason = 'api') => {
      // Closing cancels an opening still waiting for another zoom of the group.
      if (queued()) {
        group!.__mz_ticket++
      }
      if (active.__mz_original && !active.__mz_closing) {
        // Bound as a listener, close() receives an event rather than a reason.
        requested =
          typeof reason === 'string' ? (reason as ZoomCloseReason) : fallback
      }
      return close()
    }
    const closeOnPointer = () => void closeFor('pointer')
    const closeOnScroll = () => void closeFor('scroll')

    const _refit = () => {
      if (active.__mz_refit) {
        active.__mz_refit()
      }
    }

    if (!__PRESET__) {
      const composed = zoom as Omit<
        ZoomInstance<Options>,
        'close' | 'open' | 'toggle'
      > & {
        close: (reason?: ZoomCloseReason) => Promise<unknown>
        open: typeof request
        toggle: (options?: ModalOpenOptions) => Promise<unknown>
        getSnapshot: () => ZoomState
        subscribe: (listener: () => void) => () => void
      }
      composed.close = reason => closeFor(reason)
      composed.open = request
      composed.toggle = options =>
        queued() || active.__mz_original ? closeFor() : request(options)
      composed.getSnapshot = () => state
      composed.subscribe = listener => {
        subscribers!.add(listener)
        return () => subscribers!.delete(listener)
      }
      ;(zoom as ZoomInstance<Options> & { preload: Preload }).preload =
        target => {
          if (loader && images.indexOf(target as ZoomTarget) > -1) {
            loader(
              { original: target, clone: target } as ZoomLoadContext,
              () => {}
            )
          }
        }
    }
    if (Object.prototype.toString.call(selector) === '[object Object]') {
      zoomOptions = selector as Options
    } else if (
      selector ||
      typeof selector === 'string' // Route empty strings through selector validation.
    ) {
      attach(selector as ZoomSelector)
    }

    zoomOptions = assign(
      {
        margin: 0,
        background: __PRESET__ ? '#fff' : undefined,
        scrollOffset: 40,
      },
      __PRESET__ ? legacy!.defaults : undefined,
      zoomOptions
    )

    const overlay = createOverlay(zoomOptions.background)
    // Attaching at construction already committed the first state.
    if (!__PRESET__ && !state!) {
      commit()
    }

    return zoom
  }

  return mediumZoom as ZoomFactory<Options>
}
