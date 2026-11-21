import {
  assign,
  createCustomEvent,
  getPromise,
  getScrollY,
  isEscape,
} from '#platform'

import { createOverlay, getImagesFromSelectors, removeNode } from './dom'
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
   * @default '#fff'
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
}

/** What a loader works from when a zoom opens. */
export interface ZoomLoadContext {
  /** The attached image the zoom opened from. */
  readonly original: HTMLImageElement
  /** The frame on screen: a clone of `original`, already presented and animating. */
  readonly clone: HTMLImageElement
}
/**
 * Supplies a higher-resolution image for an opening zoom. Call `ready()` with a detached,
 * loaded image to show it over the frame, or without one to keep the frame. Return a cleanup
 * that cancels loading; the zoom calls it when the opening ends or is cancelled.
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
    close: Cleanup
    readonly trigger?: HTMLElement
  }): StageView
}
export interface StageView {
  readonly element: HTMLElement
  /** Another scene replaces the one whose frames and source are given: keep them on stage. */
  take(frames: readonly Frame[], source: ZoomTarget): void
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

/** Fixed presets replace this flag at build time so the bundler can remove strategy checks. */
declare const __PRESET__: boolean

export const createEngine = <Options extends CoreZoomOptions>(
  loader?: ZoomLoader,
  measureViewport?: ZoomViewport,
  stageOption?: Stage,
  legacy?: LegacyAdapter<Options>,
  adoptMedia?: (frame: Frame, media: HTMLImageElement) => void
): ZoomFactory<Options> => {
  const stage = __PRESET__ ? undefined : stageOption
  const mediumZoom = (
    selector?: ZoomSelector | Options,
    options = {} as Options
  ) => {
    const Promise = getPromise()

    const _dispatchEvent = (image: ZoomTarget, type: string) => {
      image.dispatchEvent(createCustomEvent(`medium-zoom:${type}`, { zoom }))
    }

    const isAttached = (image: ZoomTarget) => images.indexOf(image) !== -1

    const handleClick = (event: Event) => {
      const target = event.target as HTMLImageElement
      if (__PRESET__ && isAttached(target)) {
        void toggle({ target })
      } else if (target === overlay) {
        _close()
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
        active.__mz_scrollTimer = setTimeout(_close, 150)
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
        void close()
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
      newImages.forEach(image => {
        if (__PRESET__) {
          image.classList.add('medium-zoom-image')
        }
        eventListeners.forEach(([type, listener, options]) => {
          image.addEventListener(type, listener, options)
        })
      })

      newImages.forEach(image => _dispatchEvent(image, 'attach'))
      return zoom
    }

    const detach: ZoomInstance<Options>['detach'] = function () {
      if (active.__mz_original) {
        void close()
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
      if (__PRESET__ && !images.length) {
        document.removeEventListener('click', handleClick)
      }
      return zoom
    }

    const capture = (options: boolean | AddEventListenerOptions) =>
      typeof options === 'boolean' ? options : !!options.capture

    const bindEvents =
      (add: boolean): ZoomInstance<Options>['on'] =>
      (type, listener, options = {}) => {
        const eventType = `medium-zoom:${type}`
        images.forEach(image =>
          image[add ? 'addEventListener' : 'removeEventListener'](
            eventType,
            listener,
            options
          )
        )
        if (add) {
          eventListeners.push([eventType, listener, options])
        } else {
          eventListeners = eventListeners.filter(
            ([type, callback, registered]) =>
              !(
                type === eventType &&
                callback === listener &&
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
      window[method]('resize', _close)
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
            previous.__mz_original!
          )
        }
        active = current

        let cancelTransition: (() => void) | void
        let cancelImage: (() => void) | void
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
            _dispatchEvent(current.__mz_original!, 'opened')
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
        primary.addEventListener('click', _close)

        try {
          if (stage) {
            current.__mz_view =
              current.__mz_view ||
              stage.mount({ zoom, close: _close, trigger: options.trigger })
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
          return
        }
        if (!current.__mz_cancelOpen) {
          return
        }
        const host = stage ? current.__mz_view!.element : document.body
        // A replaced scene keeps its backdrop, below the frames still on stage.
        if (!previous) {
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

        current.__mz_original.classList.add('medium-zoom-image--hidden')
        primary.classList.add('medium-zoom-image--opened')

        let prepared = false
        const animate = (media?: HTMLImageElement) => {
          if ((!__PRESET__ && prepared) || !current.__mz_cancelOpen) {
            return
          }
          prepared = true
          try {
            const frames = current.__mz_frames!
            let content = primary
            if (media) {
              if (!__PRESET__ && adoptMedia) {
                adoptMedia(primary, media)
              }
              content = media
              // An authored load handler may have replaced the copied classes.
              content.classList.add('medium-zoom-image--opened')
              content.addEventListener('click', _close)
              host.appendChild(content)
              frames.push(content)
            }
            const margin = zoomOptions.margin!
            const bounds = {
              width: document.documentElement.clientWidth - margin * 2,
              height: document.documentElement.clientHeight - margin * 2,
              left: margin,
              top: margin,
            }
            const transform = fitImage(
              content,
              __PRESET__
                ? measureViewport!(bounds, zoomOptions)
                : (measureViewport && measureViewport(bounds, zoomOptions)) ||
                    bounds
            )
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

        try {
          if (__PRESET__ || loader) {
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

    const getOptions = () => zoomOptions

    const getImages = () => images

    const getZoomedImage = () => active.__mz_original || null

    let images: ZoomTarget[] = []
    let eventListeners: [
      type: string,
      listener: EventListenerOrEventListenerObject,
      options: boolean | AddEventListenerOptions,
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

    if (Object.prototype.toString.call(selector) === '[object Object]') {
      zoomOptions = selector as Options
    } else if (
      selector ||
      typeof selector === 'string' // Route empty strings through selector validation.
    ) {
      attach(selector as ZoomSelector)
    }

    zoomOptions = assign(
      { margin: 0, background: '#fff', scrollOffset: 40 },
      __PRESET__ ? legacy!.defaults : undefined,
      zoomOptions
    )

    const overlay = createOverlay(zoomOptions.background)

    return zoom
  }

  return mediumZoom as ZoomFactory<Options>
}
