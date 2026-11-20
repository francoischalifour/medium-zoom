import { getPromise, createCustomEvent, getScrollY, isEscape, assign } from '#platform'

import type { ZoomOptions } from '../medium-zoom'
import { createOverlay, getImagesFromSelectors, removeNode } from '../utils'
import { cloneImage, fitImage, isImage, type Frame, type ZoomTarget } from './frame'
import { waitForTransition } from './transition'

export type ZoomSelector = string | HTMLElement | HTMLElement[] | NodeList | null

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

export interface ZoomOpenOptions {
  /**
   * The target of the zoom.
   *
   * If not specified, the target is the first image of the zoom.
   *
   * @default null
   */
  target?: HTMLElement

  /** The control that opened the zoom; receives focus when a modal renderer closes. */
  trigger?: HTMLElement
}

export interface Zoom<Options extends CoreZoomOptions = ZoomOptions> {
  /**
   * Opens the zoom.
   *
   * @param options
   * @returns A promise resolving with the zoom.
   */
  open(options?: ZoomOpenOptions): Promise<Zoom<Options>>

  /**
   * Closes the zoom.
   *
   * @returns A promise resolving with the zoom.
   */
  close(): Promise<Zoom<Options>>

  /**
   * Toggles the zoom.
   *
   * @param options
   * @returns A promise resolving with the zoom.
   */
  toggle(options?: ZoomOpenOptions): Promise<Zoom<Options>>

  /**
   * Attaches the images to the zoom.
   *
   * @param selectors - The selectors describing the images.
   * @returns The zoom.
   */
  attach(...selectors: ZoomSelector[]): Zoom<Options>

  /**
   * Releases the images from the zoom.
   *
   * @param selectors - The selectors describing the images.
   * @returns The zoom.
   */
  detach(...selectors: ZoomSelector[]): Zoom<Options>

  /**
   * Updates the options.
   *
   * @param options
   * @returns The zoom.
   */
  update(options: Options): Zoom<Options>

  /**
   * Extends the zoom with the provided options merged with the current ones.
   *
   * @param options
   * @returns The zoom.
   */
  clone(options?: Options): Zoom<Options>

  /**
   * Registers an event handler on each target of the zoom.
   *
   * @param type - The event type to listen for.
   * @param listener - The function to execute when the event is triggered.
   * @param options - The event listener options (same as [`addEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Parameters))
   * @returns The zoom.
   */
  on(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): Zoom<Options>

  /**
   * Unregisters an event handler.
   *
   * @param type - The event type to unregister.
   * @param listener - The function to remove from the event target.
   * @param options - The event listener options (same as [`removeEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#Parameters))
   * @returns The zoom.
   */
  off(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): Zoom<Options>

  /**
   * Returns the zoom options.
   *
   * @returns The zoom options.
   */
  getOptions(): Options

  /**
   * Returns the zoom images.
   *
   * @returns The zoom images.
   */
  getImages(): HTMLElement[]

  /**
   * Returns the current zoomed image.
   *
   * @returns The current zoomed image.
   */
  getZoomedImage(): HTMLElement
}

export interface ZoomFactory<Options extends CoreZoomOptions = ZoomOptions> {
  (selector?: ZoomSelector, options?: Options): Zoom<Options>
  (options?: Options): Zoom<Options>
}

export type Cleanup = () => void
export type LegacyContent = (disposed?: boolean) => void
// Per-opening state belongs to the engine alone.
export interface Scene {
  __mz_view?: StageView
  __mz_closeContent?: LegacyContent | void
  __mz_original?: ZoomTarget
  __mz_frames?: Frame[]
  __mz_closing?: boolean
  __mz_cancelOpen?: ((opened?: boolean) => void) | null
  __mz_viewportScale?: number
  __mz_isPinching?: boolean
  __mz_scrollTimer?: ReturnType<typeof setTimeout> | null
}

export interface Viewport {
  width: number
  height: number
  left: number
  top: number
}

/** A loader returns detached media. Adoption, presentation and disposal belong to the engine. */
export interface ZoomLoadContext {
  readonly original: ZoomTarget
  readonly content: ZoomTarget
}
export type ZoomLoader = (
  content: ZoomLoadContext,
  ready: (content?: ZoomTarget) => void
) => Cleanup | void
export type ZoomViewport = (viewport: Viewport, options: Readonly<CoreZoomOptions>) => Viewport
/** Closed compatibility adapter, not an extension/install API. */
export interface LegacyAdapter {
  defaults: Partial<ZoomOptions>
  update: (options: ZoomOptions, previous: ZoomOptions) => void
  content: (frame: ZoomTarget, host: HTMLElement, options: ZoomOptions) => LegacyContent | void
}

/**
 * Where a scene is presented. Without a stage the engine presents in the document body.
 * A stage hosts frames elsewhere and can keep them through a scene replacement. It only
 * ever receives frames and callbacks: scene state stays in the engine.
 */
export interface Stage {
  mount(context: {
    readonly frame: Frame
    readonly zoom: Zoom
    close: Cleanup
    readonly trigger?: HTMLElement
  }): StageView
}
export interface StageView {
  /** The host frames are appended to. */
  readonly element: HTMLElement
  /** Another scene replaces the one whose frames and source are given: keep them on stage. */
  take(frames: readonly Frame[], source: ZoomTarget): void
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

/** Whatever issues open requests for a zoom: the zoom itself, or a session coordinating it. */
export type ZoomCommander<Options extends CoreZoomOptions = ZoomOptions> = Pick<
  Zoom<Options>,
  'open'
>

/**
 * Build constant: true in the fixed presets (`medium-zoom`, pure, compat, modern), which
 * always have the HD loader, container viewport and v1 options, and never a stage.
 * It lets those builds drop every capability check; composed core keeps them at runtime.
 */
declare const __PRESET__: boolean

/**
 * One engine sequences every zoom: collection, events, opening, loading, dismissal and
 * closing. Each argument is an optional capability; an entry that omits one does not
 * ship its code.
 */
export const createEngine = (
  loader?: ZoomLoader,
  measureViewport?: ZoomViewport,
  stageOption?: Stage,
  legacy?: LegacyAdapter,
  adoptMedia?: (frame: Frame, media: ZoomTarget) => void
): ZoomFactory => {
  const stage = __PRESET__ ? undefined : stageOption
  const mediumZoom: ZoomFactory = (
    selector?: ZoomSelector | ZoomOptions,
    options: ZoomOptions = {}
  ) => {
    const Promise = getPromise()

    const _dispatchEvent = (image: ZoomTarget, type: string) => {
      image.dispatchEvent(createCustomEvent(`medium-zoom:${type}`, { zoom }))
    }

    // Automatic pointer zoom is a v1 behavior; composed instances bind their own triggers.
    const handleClick = (event: Event) => {
      const target = event.target as HTMLImageElement
      if (__PRESET__ && images.indexOf(target) !== -1) {
        void toggle({ target })
      } else if (
        target === overlay ||
        (active.__mz_frames && active.__mz_frames.indexOf(target) !== -1)
      ) {
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
        (window.visualViewport && window.visualViewport.scale > active.__mz_viewportScale!)
      ) {
        scrollTop = currentScroll
        clearTimeout(active.__mz_scrollTimer || undefined)
        active.__mz_scrollTimer = null
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

    const update = (options: ZoomOptions = {}) => {
      const newOptions = options

      if (options.background) {
        overlay.style.background = options.background
      }

      if (__PRESET__) {
        legacy!.update(options, zoomOptions)
      }

      zoomOptions = assign({}, zoomOptions, newOptions)

      images.forEach(image => {
        _dispatchEvent(image, 'update')
      })

      return zoom
    }

    const clone = (options?: ZoomOptions) => mediumZoom(assign({}, zoomOptions, options))

    const attach: Zoom['attach'] = function () {
      const newImages = getImagesFromSelectors(arguments, isImage).filter(
        image => images.indexOf(image) === -1
      )

      if (__PRESET__ && !images.length && newImages.length) {
        document.addEventListener('click', handleClick)
      }
      images = images.concat(newImages)
      if (__PRESET__) {
        newImages.forEach(image => image.classList.add('medium-zoom-image'))
      }

      eventListeners.forEach(([type, listener, options]) => {
        newImages.forEach(image => {
          image.addEventListener(type, listener, options)
        })
      })

      newImages.forEach(image => _dispatchEvent(image, 'attach'))
      return zoom
    }

    const detach: Zoom['detach'] = function () {
      if (active.__mz_original) {
        void close()
      }

      const imagesToDetach =
        arguments.length > 0 ? getImagesFromSelectors(arguments, isImage) : images

      imagesToDetach.forEach(image => {
        if (__PRESET__) {
          image.classList.remove('medium-zoom-image')
        }
        _dispatchEvent(image, 'detach')
      })

      images = images.filter(image => imagesToDetach.indexOf(image) === -1)
      if (__PRESET__ && !images.length) {
        document.removeEventListener('click', handleClick)
      }
      return zoom
    }

    const bindEvents =
      (add: boolean): Zoom['on'] =>
      (type, listener, options = {}) => {
        const eventType = `medium-zoom:${type}`
        images.forEach(image =>
          image[add ? 'addEventListener' : 'removeEventListener'](eventType, listener, options)
        )
        if (add) {
          eventListeners.push([eventType, listener, options])
        } else {
          eventListeners = eventListeners.filter(
            ([type, callback]) =>
              !(
                type === eventType &&
                // oxlint-disable-next-line typescript/no-base-to-string -- Preserve v1 listener matching.
                callback.toString() === listener.toString()
              )
          )
        }
        return zoom
      }

    const _updateGlobalEvents = (enabled: boolean) => {
      const method = enabled ? 'addEventListener' : 'removeEventListener'
      // A stage owns Escape through its host.
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

    const open = (options: ZoomOpenOptions = {}): Promise<Zoom> => {
      const target = options.target
      // With a stage, a request for another image replaces the open scene.
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

      return new Promise<Zoom>((resolve, reject) => {
        if (
          (!previous && active.__mz_original) ||
          (target && images.indexOf(target as ZoomTarget) === -1)
        ) {
          resolve(zoom)
          return
        }
        if (previous) {
          if (previous.__mz_cancelOpen) {
            previous.__mz_cancelOpen()
          }
          // Cancellation can synchronously issue a newer request or close this scene.
          if (active !== previous || previous.__mz_closing) {
            resolve(zoom)
            return
          }
          clearTimeout(previous.__mz_scrollTimer || undefined)
          previous.__mz_original!.classList.remove('medium-zoom-image--hidden')
          current.__mz_view = previous.__mz_view
          current.__mz_view!.take(previous.__mz_frames!, previous.__mz_original!)
        }
        active = current

        let cancelTransition: (() => void) | void
        let cancelImage: (() => void) | void
        let frame: number
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
        // Presentation settled: the zoom transition ended, or a stage finished its own.
        const settle = (error?: unknown) => {
          if (!current.__mz_cancelOpen) {
            return
          }
          cancelTransition = undefined
          if (error !== undefined) {
            reject(error)
            void close()
          } else {
            finishOpening(true)
          }
        }
        current.__mz_cancelOpen = finishOpening
        current.__mz_original = (target as ZoomTarget) || images[0]
        if (!current.__mz_original) {
          resolve(zoom)
          return
        }
        current.__mz_viewportScale = window.visualViewport ? window.visualViewport.scale : 1
        _updateGlobalEvents(true)
        _dispatchEvent(current.__mz_original!, 'open')
        if (!current.__mz_cancelOpen) {
          return
        }

        scrollTop = getScrollY()
        const primary = cloneImage(current.__mz_original as HTMLImageElement, stage)
        current.__mz_frames = [primary]

        try {
          if (stage) {
            current.__mz_view =
              current.__mz_view ||
              stage.mount({ frame: primary, zoom, close: _close, trigger: options.trigger })
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
            current.__mz_closeContent = legacy!.content(primary, host, zoomOptions)
          }
        } catch (error) {
          reject(error)
          void close()
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
        const animate = (media?: ZoomTarget) => {
          if (prepared || !current.__mz_cancelOpen) {
            return
          }
          prepared = true
          try {
            const frames = current.__mz_frames!
            let content = primary
            if (media) {
              // The preset's own loader already copied the frame's presentation.
              if (!__PRESET__ && adoptMedia) {
                adoptMedia(primary, media)
              }
              content = media as Frame
              // An authored load handler may have replaced the copied classes.
              content.classList.add('medium-zoom-image--opened')
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
                : (measureViewport && measureViewport(bounds, zoomOptions)) || bounds
            )
            if (stage) {
              cancelTransition = current.__mz_view!.present(frames, transform, settle)
            }
            if (!cancelTransition) {
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
            reject(error)
            void close()
          }
        }

        try {
          if (__PRESET__ || loader) {
            cancelImage = loader!({ original: current.__mz_original!, content: primary }, animate)
            if (!current.__mz_cancelOpen && cancelImage) {
              cancelImage()
            }
          } else {
            animate()
          }
        } catch (error) {
          reject(error)
          void close()
        }
      })
    }

    let closing: Promise<Zoom> | undefined
    const close = () => {
      if (closing) {
        return closing
      }
      const promise = new Promise<Zoom>((resolve, reject) => {
        const current = active
        const primary = current.__mz_frames && current.__mz_frames[0]
        if (!current.__mz_original || current.__mz_closing) {
          resolve(zoom)
          return
        }

        current.__mz_closing = true
        if (current.__mz_cancelOpen) {
          current.__mz_cancelOpen()
        }
        clearTimeout(current.__mz_scrollTimer || undefined)
        const finishClosing = () => {
          current.__mz_original!.classList.remove('medium-zoom-image--hidden')
          ;(current.__mz_frames || []).forEach(removeNode)
          removeNode(overlay)
          const view = __PRESET__ ? undefined : current.__mz_view
          active = {}
          closing = undefined
          _updateGlobalEvents(false)
          try {
            try {
              if (current.__mz_closeContent) {
                current.__mz_closeContent(true)
              }
            } finally {
              if (view) {
                view.dispose()
              }
            }
            resolve(zoom)
          } catch (error) {
            reject(error)
          } finally {
            _dispatchEvent(current.__mz_original!, 'closed')
          }
        }

        // Install completion before dispatching events, whose listeners may interact again.
        if (primary) {
          waitForTransition(primary, finishClosing)
        }
        document.body.classList.remove('medium-zoom--opened')
        ;(current.__mz_frames || []).forEach(frame => {
          frame.style.transform = ''
        })
        try {
          if (current.__mz_closeContent) {
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

    const toggle = (options: ZoomOpenOptions = {}) => {
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
    let zoomOptions: ZoomOptions = options
    let active: Scene = {}

    // Construct the public instance before attach() returns it.
    const zoom: Zoom = {
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
      getImages: getImages as Zoom['getImages'],
      // Preserve the legacy declaration; a closed zoom returns null at runtime.
      getZoomedImage: getZoomedImage as Zoom['getZoomedImage'],
    }

    const _close = () => {
      void close()
    }

    // If the selector is omitted, it's replaced by the options
    if (Object.prototype.toString.call(selector) === '[object Object]') {
      zoomOptions = selector as ZoomOptions
    } else if (
      selector ||
      typeof selector === 'string' // to process empty string as a selector
    ) {
      attach(selector as ZoomSelector)
    }

    // Apply the default option values
    zoomOptions = assign(
      { margin: 0, background: '#fff', scrollOffset: 40 },
      __PRESET__ ? legacy!.defaults : undefined,
      zoomOptions
    )

    const overlay = createOverlay(zoomOptions.background)

    return zoom
  }

  return mediumZoom
}
