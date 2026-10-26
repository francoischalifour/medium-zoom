import { getPromise, createCustomEvent, getScrollY, isEscape } from '#platform'
import type { Zoom, ZoomFactory, ZoomOptions, ZoomSelector, ZoomOpenOptions } from '../types'
import type { FeatureHooks, Session } from './types'
import { waitForTransition } from './transition'
import { cloneTarget, createOverlay, getImagesFromSelectors, isSvg } from '../utils'

const transformNodes = (session: Session, transform: string) => {
  ;(session.__mz_nodes || []).forEach(node => {
    if (node.tagName === 'IMG') node.style.transform = transform
  })
}

export const createZoomFactory = ({
  features = [],
}: { features?: readonly FeatureHooks[] } = {}): ZoomFactory => {
  // A factory keeps its capabilities even if the caller later edits its array.
  features = features.slice()
  const hooks = features.reduce<FeatureHooks>(
    (hooks, feature) => ({
      ...hooks,
      ...feature,
      defaults: { ...hooks.defaults, ...feature.defaults },
    }),
    { defaults: { margin: 0, background: '#fff', scrollOffset: 40 } }
  )
  const mediumZoom: ZoomFactory = (
    selector?: ZoomSelector | ZoomOptions,
    options: ZoomOptions = {}
  ) => {
    const Promise = getPromise()

    const _close = () => {
      void close()
    }

    const _dispatchEvent = (image: HTMLImageElement, type: string) =>
      image.dispatchEvent(createCustomEvent(`medium-zoom:${type}`, { zoom }))

    const _handleClick = (event: MouseEvent) => {
      const { target } = event

      if (target === overlay) {
        void close()
        return
      }

      if (images.indexOf(target as HTMLImageElement) === -1) {
        return
      }

      void toggle({ target: target as HTMLElement })
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

      if (isAnimating) return

      if (
        Math.abs(scrollTop - currentScroll) > zoomOptions.scrollOffset! &&
        !active.__mz_scrollTimer
      ) {
        active.__mz_scrollTimer = setTimeout(_close, 150)
      }
    }

    const _handleTouch = (event: TouchEvent) => {
      if (event.touches.length >= 2) active.__mz_isPinching = true
      if (active.__mz_isPinching) _handleScroll()

      // Keep protecting the gesture when one finger lifts before the other.
      if (event.touches.length === 0) active.__mz_isPinching = false
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

      features.forEach(feature => {
        if (feature.update) feature.update(options, zoomOptions)
      })

      zoomOptions = { ...zoomOptions, ...newOptions }

      images.forEach(image => {
        _dispatchEvent(image, 'update')
      })

      return zoom
    }

    const clone = (options?: ZoomOptions) => mediumZoom({ ...zoomOptions, ...options })

    let clickListening = false
    const _updateClickListener = () => {
      const enabled = images.length > 0
      if (clickListening === enabled) return

      document[enabled ? 'addEventListener' : 'removeEventListener'](
        'click',
        _handleClick as EventListener
      )
      clickListening = enabled
    }

    const attach = (...selectors: ZoomSelector[]) => {
      const newImages = getImagesFromSelectors(selectors)

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

      _updateClickListener()

      return zoom
    }

    const detach = (...selectors: ZoomSelector[]) => {
      if (active.__mz_zoomed) {
        void close()
      }

      const imagesToDetach = selectors.length > 0 ? getImagesFromSelectors(selectors) : images

      imagesToDetach.forEach(image => {
        image.classList.remove('medium-zoom-image')
        _dispatchEvent(image, 'detach')
      })

      images = images.filter(image => imagesToDetach.indexOf(image) === -1)
      _updateClickListener()

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

    let globalListening = false
    const _updateGlobalEvents = (enabled: boolean) => {
      if (globalListening === enabled) return

      const method = enabled ? 'addEventListener' : 'removeEventListener'
      document[method]('keyup', _handleKeyUp as EventListener)
      document[method]('scroll', _handleScroll)
      const touchOptions = { passive: true }
      ;['touchstart', 'touchend', 'touchcancel'].forEach(type =>
        document[method](type, _handleTouch as EventListener, touchOptions)
      )
      window[method]('resize', _close)
      globalListening = enabled
    }

    const open = ({ target }: ZoomOpenOptions = {}) => {
      const current: Session = {}
      const _animate = (zoomTarget = current.__mz_original!) => {
        const margin = zoomOptions.margin!
        let viewport = {
          width: document.documentElement.clientWidth - margin * 2,
          height: document.documentElement.clientHeight - margin * 2,
          left: margin,
          top: margin,
        }
        if (hooks.viewport) viewport = hooks.viewport(zoomOptions, viewport)
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

        if (!width || !height) return

        const scaleX = Math.min(Math.max(width, naturalWidth), viewportWidth) / width
        const scaleY = Math.min(Math.max(height, naturalHeight), viewportHeight) / height
        const scale = Math.min(scaleX, scaleY)
        const translateX = (-left + (viewportWidth - width) / 2 + viewportLeft) / scale
        const translateY = (-top + (viewportHeight - height) / 2 + viewportTop) / scale
        const transform = `scale(${scale}) translate3d(${translateX}px, ${translateY}px, 0)`

        transformNodes(current, transform)
      }

      return new Promise<Zoom>(resolve => {
        if (active.__mz_original || (target && images.indexOf(target as HTMLImageElement) === -1)) {
          resolve(zoom)
          return
        }
        active = current

        let cancelTransition: (() => void) | undefined
        let cancelImage: (() => void) | undefined
        let frame: number
        const finishOpening = (opened = false) => {
          if (!current.__mz_cancelOpen) return
          if (cancelTransition) cancelTransition()
          if (cancelImage) cancelImage()
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
        if (current.__mz_closing) return

        scrollTop = getScrollY()
        current.__mz_zoomed = cloneTarget(current.__mz_original)
        current.__mz_nodes = [current.__mz_zoomed, overlay]

        document.body.appendChild(overlay)

        if (hooks.mount) hooks.mount(current, zoomOptions)

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

        document.body.appendChild(current.__mz_zoomed)

        frame = window.requestAnimationFrame(() => {
          document.body.classList.add('medium-zoom--opened')
        })

        current.__mz_original.classList.add('medium-zoom-image--hidden')
        current.__mz_zoomed.classList.add('medium-zoom-image--opened')

        current.__mz_zoomed.addEventListener('click', _close)

        const animate = (target?: HTMLImageElement) => {
          _animate(target)
          cancelTransition = waitForTransition(current.__mz_zoomed!, () => finishOpening(true))
        }

        if (hooks.load) cancelImage = hooks.load(current, animate, _close)
        if (!cancelImage) animate()
      })
    }

    const close = () =>
      new Promise<Zoom>(resolve => {
        const current = active
        if (!current.__mz_original || current.__mz_closing) {
          resolve(zoom)
          return
        }

        current.__mz_closing = true
        if (current.__mz_cancelOpen) current.__mz_cancelOpen()
        clearTimeout(current.__mz_scrollTimer || undefined)
        isAnimating = true
        const finishClosing = () => {
          current.__mz_original!.classList.remove('medium-zoom-image--hidden')
          ;(current.__mz_nodes || []).forEach(node => {
            node.removeEventListener('click', _close)
            if (node.parentNode) node.parentNode.removeChild(node)
          })
          active = {}
          isAnimating = false
          _updateGlobalEvents(false)
          resolve(zoom)
          _dispatchEvent(current.__mz_original!, 'closed')
        }

        // Install completion before dispatching events, whose listeners may interact again.
        if (current.__mz_zoomed) waitForTransition(current.__mz_zoomed!, finishClosing)
        document.body.classList.remove('medium-zoom--opened')
        transformNodes(current, '')
        if (hooks.closing) hooks.closing(current)
        _dispatchEvent(current.__mz_original!, 'close')
        if (!current.__mz_zoomed) finishClosing()
      })

    const toggle = ({ target }: ZoomOpenOptions = {}) => {
      if (active.__mz_original) {
        return close()
      }

      return open({ target })
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
    let active: Session = {}

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
    zoomOptions = { ...hooks.defaults, ...zoomOptions }

    const overlay = createOverlay(zoomOptions.background)

    return zoom
  }

  return mediumZoom
}
