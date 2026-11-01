import { getPromise, createCustomEvent, getScrollY, isEscape, assign } from '#platform'

import type { Zoom, ZoomFactory, ZoomOptions, ZoomSelector, ZoomOpenOptions } from '../types'
import { cloneTarget, createOverlay, getImagesFromSelectors, isSvg } from '../utils'
import { waitForTransition } from './transition'
import type { EngineHooks, Scene, RendererHooks } from './types'

const transformNodes = (session: Scene, transform: string) => {
  ;(session.__mz_nodes || []).forEach(node => {
    if (node.tagName === 'IMG') {
      node.style.transform = transform
    }
  })
}

export const createZoom = (hooks: EngineHooks, renderer?: RendererHooks): ZoomFactory => {
  const mediumZoom: ZoomFactory = (
    selector?: ZoomSelector | ZoomOptions,
    options: ZoomOptions = {}
  ) => {
    const Promise = getPromise()

    const _close = () => {
      void zoom.close()
    }

    const _dispatchEvent = (image: HTMLImageElement, type: string) =>
      image.dispatchEvent(createCustomEvent(`medium-zoom:${type}`, { zoom }))

    const _handleClick = (event: MouseEvent) => {
      const { target } = event
      if (
        renderer &&
        (event.defaultPrevented ||
          /^(link|checkbox|radio|switch|menuitem)$/.test(
            (target as Element).getAttribute('role') || ''
          ) ||
          (target as Element).parentElement?.closest(
            'button,a[href],input,select,textarea,summary,label,[role="button"],[role="link"],[role="checkbox"],[role="radio"],[role="switch"],[role="menuitem"],[contenteditable]'
          ))
      ) {
        return
      }

      if (target === overlay) {
        void close()
        return
      }

      if (renderer && active.__mz_original) {
        return
      }

      if (images.indexOf(target as HTMLImageElement) === -1) {
        return
      }

      void zoom.toggle({ target: target as HTMLElement })
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

      if (isAnimating) {
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

      hooks.__mz_update(options, zoomOptions)

      zoomOptions = assign({}, zoomOptions, newOptions)

      images.forEach(image => {
        _dispatchEvent(image, 'update')
      })

      return zoom
    }

    const clone = (options?: ZoomOptions) => mediumZoom(assign({}, zoomOptions, options))

    const attach: Zoom['attach'] = function () {
      const newImages = getImagesFromSelectors(arguments)
      if (!images.length && newImages.length) {
        document.addEventListener('click', _handleClick as EventListener)
      }

      newImages
        .filter(newImage => images.indexOf(newImage) === -1)
        .forEach(newImage => {
          images.push(newImage)
          newImage.classList.add('medium-zoom-image')
        })

      eventListeners.forEach(({ type, listener, options }) => {
        newImages.forEach(image => {
          image.addEventListener(type, listener, options)
        })
      })

      return zoom
    }

    const detach: Zoom['detach'] = function () {
      if (active.__mz_zoomed) {
        void close()
      }

      const imagesToDetach = arguments.length > 0 ? getImagesFromSelectors(arguments) : images

      imagesToDetach.forEach(image => {
        image.classList.remove('medium-zoom-image')
        _dispatchEvent(image, 'detach')
      })

      const remaining = images.filter(image => imagesToDetach.indexOf(image) === -1)
      if (images.length && !remaining.length) {
        document.removeEventListener('click', _handleClick as EventListener)
      }
      images = remaining
      return zoom
    }

    const on: Zoom['on'] = (type, listener, options = {}) => {
      const eventType = `medium-zoom:${type}`
      images.forEach(image => {
        image.addEventListener(eventType, listener, options)
      })

      eventListeners.push({ type: eventType, listener, options })

      return zoom
    }

    const off: Zoom['off'] = (type, listener, options = {}) => {
      const eventType = `medium-zoom:${type}`
      images.forEach(image => {
        image.removeEventListener(eventType, listener, options)
      })

      eventListeners = eventListeners.filter(
        eventListener =>
          !(
            eventListener.type === eventType &&
            // oxlint-disable-next-line typescript/no-base-to-string -- Preserve v1 listener matching.
            eventListener.listener.toString() === listener.toString()
          )
      )

      return zoom
    }

    const _updateGlobalEvents = (enabled: boolean) => {
      const method = enabled ? 'addEventListener' : 'removeEventListener'
      if (!renderer) {
        document[method]('keyup', _handleKeyUp as EventListener)
      }
      document[method]('scroll', _handleScroll)
      const touchOptions = { passive: true }
      ;['touchstart', 'touchend', 'touchcancel'].forEach(type =>
        document[method](type, _handleTouch as EventListener, touchOptions)
      )
      window[method]('resize', _close)
    }

    const open = ({ target, trigger }: ZoomOpenOptions = {}, previous?: Scene) => {
      const current: Scene = {}
      const replacing = renderer ? previous : undefined
      const _animate = (zoomTarget = current.__mz_original!) => {
        const margin = zoomOptions.margin!
        let viewport = {
          width: document.documentElement.clientWidth - margin * 2,
          height: document.documentElement.clientHeight - margin * 2,
          left: margin,
          top: margin,
        }
        viewport = hooks.__mz_viewport(zoomOptions, viewport)
        const {
          width: viewportWidth,
          height: viewportHeight,
          left: viewportLeft,
          top: viewportTop,
        } = viewport

        const naturalWidth = isSvg(zoomTarget)
          ? viewportWidth
          : zoomTarget.naturalWidth || viewportWidth
        const naturalHeight = isSvg(zoomTarget)
          ? viewportHeight
          : zoomTarget.naturalHeight || viewportHeight
        const { top, left, width, height } = zoomTarget.getBoundingClientRect()

        if (!width || !height) {
          return
        }

        const scaleX = Math.min(Math.max(width, naturalWidth), viewportWidth) / width
        const scaleY = Math.min(Math.max(height, naturalHeight), viewportHeight) / height
        const scale = Math.min(scaleX, scaleY)
        const translateX = (-left + (viewportWidth - width) / 2 + viewportLeft) / scale
        const translateY = (-top + (viewportHeight - height) / 2 + viewportTop) / scale
        const transform = `scale(${scale}) translate3d(${translateX}px, ${translateY}px, 0)`

        transformNodes(current, transform)
      }

      return new Promise<Zoom>((resolve, reject) => {
        if (
          (!replacing && active.__mz_original) ||
          replacing?.__mz_closing ||
          (target && images.indexOf(target as HTMLImageElement) === -1)
        ) {
          resolve(zoom)
          return
        }
        if (replacing) {
          current.__mz_host = replacing.__mz_host
          current.__mz_disposeHost = replacing.__mz_disposeHost
          replacing.__mz_cancelOpen?.()
          clearTimeout(replacing.__mz_scrollTimer || undefined)
          replacing.__mz_original!.classList.remove('medium-zoom-image--hidden')
          const nodes = replacing.__mz_nodes!.concat(replacing.__mz_outgoing || [])
          current.__mz_outgoing = nodes.filter(node => node.tagName === 'IMG' && node.isConnected)
          nodes.forEach(node => {
            if (node.tagName !== 'IMG' && node !== overlay) {
              node.remove()
            }
          })
        }
        active = current

        let cancelTransition: (() => void) | undefined
        let cancelImage: (() => void) | undefined
        let frame: number
        const finishOpening = (opened = false) => {
          if (!current.__mz_cancelOpen) {
            return
          }
          if (cancelTransition) {
            cancelTransition()
          }
          if (cancelImage) {
            cancelImage()
          }
          window.cancelAnimationFrame(frame)
          current.__mz_cancelOpen = null
          isAnimating = false
          resolve(zoom)
          if (opened) {
            document.body.classList.add('medium-zoom--opened')
            _dispatchEvent(current.__mz_original!, 'opened')
          }
        }
        current.__mz_cancelOpen = finishOpening
        current.__mz_original = (target as HTMLImageElement) || images[0]
        if (!current.__mz_original) {
          resolve(zoom)
          return
        }
        current.__mz_viewportScale = window.visualViewport ? window.visualViewport.scale : 1
        _updateGlobalEvents(true)
        isAnimating = true
        _dispatchEvent(current.__mz_original!, 'open')
        if (current.__mz_closing) {
          return
        }

        scrollTop = getScrollY()
        current.__mz_zoomed = cloneTarget(current.__mz_original)
        if (replacing) {
          current.__mz_zoomed.style.visibility = 'hidden'
        }
        current.__mz_nodes = [current.__mz_zoomed, overlay]

        try {
          if (renderer) {
            const host = previous
              ? undefined
              : renderer.mount(current.__mz_zoomed, current.__mz_original, _close, trigger)
            current.__mz_host = previous ? previous.__mz_host : host!.element
            current.__mz_disposeHost = previous ? previous.__mz_disposeHost : host!.dispose
            current.__mz_refreshHost = previous ? previous.__mz_refreshHost : host!.update
            current.__mz_zoom = zoom
            current.__mz_navigate = target =>
              active === current ? open({ target }, current) : Promise.resolve(zoom)
            current.__mz_refreshHost?.(current.__mz_zoomed, current.__mz_original)
          } else {
            current.__mz_host = document.body
          }
        } catch (error) {
          reject(error)
          finishOpening()
          current.__mz_disposeHost?.()
          active = {}
          _updateGlobalEvents(false)
          return
        }
        if (current.__mz_closing) {
          return
        }
        // Keep the backdrop below outgoing frames while a gallery scene is loading.
        if (!replacing) {
          current.__mz_host!.appendChild(overlay)
        }

        try {
          hooks.__mz_mount(current, zoomOptions)
        } catch (error) {
          reject(error)
          void close()
          return
        }
        if (current.__mz_closing || active !== current) {
          return
        }

        // If the selected <img> tag is inside a <picture> tag, set the
        // currently-applied source as the cloned `src=` attribute.
        // (as these might differ, or src= might be unset in some cases)
        if (
          current.__mz_original.parentElement &&
          current.__mz_original.parentElement.tagName === 'PICTURE' &&
          current.__mz_original.currentSrc
        ) {
          current.__mz_zoomed.src = current.__mz_original.currentSrc
        }

        current.__mz_host!.appendChild(current.__mz_zoomed)

        frame = window.requestAnimationFrame(() => {
          document.body.classList.add('medium-zoom--opened')
        })

        current.__mz_original.classList.add('medium-zoom-image--hidden')
        current.__mz_zoomed.classList.add('medium-zoom-image--opened')

        current.__mz_zoomed.addEventListener('click', _close)

        const animate = (target?: HTMLImageElement) => {
          _animate(target)
          const done = () => finishOpening(true)
          cancelTransition =
            (renderer && hooks.__mz_transition?.(current, done)) ||
            waitForTransition(current.__mz_zoomed!, done)
        }

        cancelImage = hooks.__mz_load(current, animate, _close)
        if (!cancelImage) {
          animate()
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
        if (!current.__mz_original || current.__mz_closing) {
          resolve(zoom)
          return
        }

        current.__mz_closing = true
        if (current.__mz_cancelOpen) {
          current.__mz_cancelOpen()
        }
        clearTimeout(current.__mz_scrollTimer || undefined)
        isAnimating = true
        const finishClosing = () => {
          current.__mz_original!.classList.remove('medium-zoom-image--hidden')
          ;(current.__mz_nodes || []).concat(current.__mz_outgoing || []).forEach(node => {
            node.removeEventListener('click', _close)
            if (node.parentNode) {
              node.parentNode.removeChild(node)
            }
          })
          const disposeHost = current.__mz_disposeHost
          active = {}
          closing = undefined
          isAnimating = false
          _updateGlobalEvents(false)
          if (disposeHost) {
            disposeHost()
          }
          resolve(zoom)
          _dispatchEvent(current.__mz_original!, 'closed')
        }

        // Install completion before dispatching events, whose listeners may interact again.
        if (current.__mz_zoomed) {
          waitForTransition(current.__mz_zoomed!, finishClosing)
        }
        document.body.classList.remove('medium-zoom--opened')
        transformNodes(current, '')
        hooks.__mz_closing(current)
        _dispatchEvent(current.__mz_original!, 'close')
        if (!current.__mz_zoomed) {
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

    let images: HTMLImageElement[] = []
    let eventListeners: {
      type: string
      listener: EventListenerOrEventListenerObject
      options: boolean | AddEventListenerOptions
    }[] = []
    let isAnimating = false
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
      on,
      off,
      getOptions,
      getImages,
      // Preserve the legacy declaration; a closed zoom returns null at runtime.
      getZoomedImage: getZoomedImage as Zoom['getZoomedImage'],
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
      hooks.__mz_defaults,
      zoomOptions
    )

    const overlay = createOverlay(zoomOptions.background)

    return zoom
  }

  return mediumZoom
}
