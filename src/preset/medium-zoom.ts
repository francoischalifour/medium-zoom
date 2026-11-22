import {
  assign,
  createCustomEvent,
  getPromise,
  getScrollY,
  getViewportScale,
  isEscape,
} from '#platform'
import {
  type ContainerOptions,
  getContainerViewport,
  isBounds,
} from '@/zoom/container'
import {
  createOverlay,
  getImagesFromSelectors,
  removeNode,
  resolveElement,
} from '@/zoom/dom'
import { cloneImage, fitImage, type Frame, type ZoomTarget } from '@/zoom/frame'
import { loadHdImage } from '@/zoom/hd-image'
import { waitForTransition } from '@/zoom/transition'
import type {
  CoreZoomOptions,
  ZoomFactory,
  ZoomInstance,
  ZoomOpenOptions,
  ZoomSelector,
} from '@/zoom/types'

export interface TemplateOptions {
  /**
   * The template element, or its selector, whose content is displayed on zoom.
   *
   * @default null
   */
  template?: string | HTMLTemplateElement | null
}

/** The v1 options: core options plus the container and template the presets always support. */
export interface ZoomOptions
  extends CoreZoomOptions, ContainerOptions, TemplateOptions {}

/** A zoom created by `mediumZoom()`. */
export interface Zoom<
  Options extends CoreZoomOptions = ZoomOptions,
> extends ZoomInstance<Options> {
  // FIXME(v2): Include null in the return type when the zoom is closed.
  /**
   * Returns the current zoomed image.
   *
   * @returns The current zoomed image. A closed zoom returns `null` at runtime; the v1
   * declaration is kept.
   */
  getZoomedImage(): HTMLElement
}

/** One opening of the zoom, from `open()` until its closing transition ends. */
interface Scene {
  __mz_original?: ZoomTarget
  __mz_frames?: Frame[]
  __mz_closing?: boolean
  /** Ends the opening; unset once it has ended, opened or not. */
  __mz_cancelOpen?: ((opened?: boolean) => void) | null
  __mz_viewportScale?: number
  __mz_isPinching?: boolean
  __mz_scrollTimer?: ReturnType<typeof setTimeout>
  /** The template's content, faded out as the zoom closes. */
  __mz_template?: HTMLElement
}

/**
 * Attaches a zoom to the images matching `selector`, opening on click and closing on
 * click, scroll, resize and Escape. Loads `data-zoom-src` or `srcset` images in high
 * resolution.
 *
 * @example mediumZoom('[data-zoomable]', { margin: 24 })
 */
const mediumZoom = ((
  selector?: ZoomSelector | ZoomOptions,
  options: ZoomOptions = {}
) => {
  const Promise = getPromise()

  const dispatch = (image: ZoomTarget, type: string) => {
    image.dispatchEvent(createCustomEvent(`medium-zoom:${type}`, { zoom }))
  }

  const isAttached = (image: ZoomTarget) => images.indexOf(image) !== -1

  const handleClick = (event: Event) => {
    const target = event.target as HTMLImageElement
    if (isAttached(target)) {
      void toggle({ target })
    } else if (target === overlay) {
      dismiss()
    }
  }

  const handleScroll = () => {
    if (!active.__mz_original) {
      return
    }

    const currentScroll = getScrollY()

    // Pinching and panning a magnified page must keep the full-size image open.
    if (
      active.__mz_isPinching ||
      getViewportScale() > active.__mz_viewportScale!
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
      active.__mz_scrollTimer = setTimeout(dismiss, 150)
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
    if (isEscape(event)) {
      dismiss()
    }
  }

  const update = (options: ZoomOptions = {}) => {
    if (options.background) {
      overlay.style.background = options.background
    }

    // FIXME(v2): Normalize a copy so update() accepts frozen options.
    if (isBounds(options.container)) {
      options.container = assign(
        {},
        isBounds(zoomOptions.container) ? zoomOptions.container : undefined,
        options.container
      )
    }
    if (options.template) {
      options.template = resolveElement(options.template)
    }

    zoomOptions = assign({}, zoomOptions, options)

    images.forEach(image => {
      dispatch(image, 'update')
    })

    return zoom
  }

  const clone = (options?: ZoomOptions) =>
    mediumZoom(assign({}, zoomOptions, options))

  const attach: Zoom['attach'] = function () {
    const newImages = getImagesFromSelectors(
      arguments,
      image => !isAttached(image)
    )

    if (!images.length && newImages.length) {
      document.addEventListener('click', handleClick)
    }
    images = images.concat(newImages)
    newImages.forEach(image => {
      image.classList.add('medium-zoom-image')
      eventListeners.forEach(([type, listener, options]) => {
        image.addEventListener(type, listener, options)
      })
    })

    newImages.forEach(image => dispatch(image, 'attach'))
    return zoom
  }

  const detach: Zoom['detach'] = function () {
    if (active.__mz_original) {
      dismiss()
    }

    const detached = arguments.length
      ? getImagesFromSelectors(arguments, isAttached)
      : images
    detached.forEach(image => {
      image.classList.remove('medium-zoom-image')
      dispatch(image, 'detach')
    })
    images = images.filter(image => detached.indexOf(image) === -1)
    if (!images.length) {
      document.removeEventListener('click', handleClick)
    }
    return zoom
  }

  const capture = (options: boolean | AddEventListenerOptions) =>
    typeof options === 'boolean' ? options : !!options.capture

  const bindEvents =
    (add: boolean): Zoom['on'] =>
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

  const updateGlobalEvents = (enabled: boolean) => {
    const method = enabled ? 'addEventListener' : 'removeEventListener'
    document[method]('keyup', handleKeyUp as EventListener)
    document[method]('scroll', handleScroll)
    const touchOptions = { passive: true }
    ;['touchstart', 'touchend', 'touchcancel'].forEach(type =>
      document[method](type, handleTouch as EventListener, touchOptions)
    )
    window[method]('resize', dismiss)
  }

  const open = ({ target }: ZoomOpenOptions = {}): Promise<Zoom> => {
    const current: Scene = {}

    return new Promise<Zoom>((resolve, reject) => {
      if (
        !images.length ||
        active.__mz_original ||
        (target && !isAttached(target))
      ) {
        resolve(zoom)
        return
      }
      active = current
      const host = document.body

      let cancelTransition: (() => void) | void
      let cancelImage: (() => void) | void
      let frame: number
      const fail = (error: unknown) => {
        reject(error)
        dismiss()
      }
      const finishOpening = (opened?: boolean) => {
        if (!current.__mz_cancelOpen) {
          return
        }
        current.__mz_cancelOpen = null
        if (cancelTransition) {
          cancelTransition()
        }
        if (cancelImage) {
          cancelImage()
        }
        cancelAnimationFrame(frame)
        resolve(zoom)
        if (opened) {
          host.classList.add('medium-zoom--opened')
          dispatch(original, 'opened')
        }
      }
      current.__mz_cancelOpen = finishOpening
      const original = (current.__mz_original = target || images[0]!)
      current.__mz_viewportScale = getViewportScale()
      updateGlobalEvents(true)
      dispatch(original, 'open')
      if (!current.__mz_cancelOpen) {
        return
      }

      scrollTop = getScrollY()
      const primary = cloneImage(original as HTMLImageElement)
      const frames = (current.__mz_frames = [primary])
      // Listen on the frame because mobile WebKit can fail to deliver its click to the document.
      primary.addEventListener('click', dismiss)

      host.appendChild(overlay)
      try {
        if (zoomOptions.template) {
          const content = (current.__mz_template =
            document.createElement('div'))
          content.appendChild(
            resolveElement(zoomOptions.template)!.content.cloneNode(true)
          )
          host.appendChild(content)
        }
      } catch (error) {
        fail(error)
        return
      }
      if (!current.__mz_cancelOpen) {
        return
      }

      host.appendChild(primary)

      frame = requestAnimationFrame(() => {
        host.classList.add('medium-zoom--opened')
      })

      original.classList.add('medium-zoom-image--hidden')
      primary.classList.add('medium-zoom-image--opened')

      // Copying an attribute the DOM cannot set, such as a framework's `@click`, throws.
      try {
        cancelImage = loadHdImage(
          { original: original as HTMLImageElement, clone: primary },
          media => {
            if (!current.__mz_cancelOpen) {
              return
            }
            try {
              if (media) {
                // An authored load handler may have replaced the copied classes.
                media.classList.add('medium-zoom-image--opened')
                media.addEventListener('click', dismiss)
                host.appendChild(media)
                frames.push(media)
              }
              const transform = fitImage(
                media || primary,
                getContainerViewport(zoomOptions.container, zoomOptions.margin!)
              )
              if (transform) {
                frames.forEach(frame => {
                  frame.style.transform = transform
                })
              }
              cancelTransition = waitForTransition(primary, () =>
                finishOpening(true)
              )
            } catch (error) {
              fail(error)
            }
          }
        )
        if (!current.__mz_cancelOpen && cancelImage) {
          cancelImage()
        }
      } catch (error) {
        fail(error)
      }
    })
  }

  let closing: Promise<Zoom> | undefined
  const close = () => {
    if (closing) {
      return closing
    }
    const promise = new Promise<Zoom>(resolve => {
      const current = active
      const original = current.__mz_original
      const frames = current.__mz_frames || []
      const primary = frames[0]
      const content = current.__mz_template
      if (!original || current.__mz_closing) {
        resolve(zoom)
        return
      }

      current.__mz_closing = true
      if (current.__mz_cancelOpen) {
        current.__mz_cancelOpen()
      }
      clearTimeout(current.__mz_scrollTimer)
      const finishClosing = () => {
        original.classList.remove('medium-zoom-image--hidden')
        frames.forEach(removeNode)
        removeNode(overlay)
        active = {}
        closing = undefined
        updateGlobalEvents(false)
        if (content) {
          removeNode(content)
        }
        resolve(zoom)
        dispatch(original, 'closed')
      }

      // Set up completion before firing events because listeners can start another operation synchronously.
      if (primary) {
        waitForTransition(primary, finishClosing)
      }
      document.body.classList.remove('medium-zoom--opened')
      frames.forEach(frame => {
        frame.style.transform = ''
      })
      if (content) {
        content.style.transition = parseFloat(
          getComputedStyle(primary!).transitionDuration
        )
          ? 'opacity 150ms'
          : 'none'
        content.style.opacity = '0'
      }
      dispatch(original, 'close')
      if (!primary) {
        finishClosing()
      }
    })
    if (active.__mz_closing) {
      closing = promise
    }
    return promise
  }

  const toggle = (options?: ZoomOpenOptions) =>
    active.__mz_original ? close() : open(options)

  const dismiss = () => {
    void close()
  }

  let images: ZoomTarget[] = []
  let eventListeners: [
    type: string,
    listener: EventListenerOrEventListenerObject,
    options: boolean | AddEventListenerOptions,
  ][] = []
  let scrollTop = 0
  let zoomOptions = options
  let active: Scene = {}

  const zoom = {
    open,
    close,
    toggle,
    update,
    clone,
    attach,
    detach,
    on: bindEvents(true),
    off: bindEvents(false),
    getOptions: () => zoomOptions,
    getImages: () => images,
    getZoomedImage: () => active.__mz_original || null,
  } as Zoom

  if (Object.prototype.toString.call(selector) === '[object Object]') {
    zoomOptions = selector as ZoomOptions
  } else if (
    selector ||
    typeof selector === 'string' // Route empty strings through selector validation.
  ) {
    attach(selector as ZoomSelector)
  }

  zoomOptions = assign(
    {
      margin: 0,
      background: '#fff',
      scrollOffset: 40,
      container: null,
      template: null,
    },
    zoomOptions
  )

  const overlay = createOverlay(zoomOptions.background)

  return zoom
}) as ZoomFactory<ZoomOptions, Zoom>

export default mediumZoom
export type { ZoomSelector, ZoomOpenOptions } from '@/zoom/types'
export type { ZoomContainer } from '@/zoom/container'
