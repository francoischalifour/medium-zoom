import { getPromise, createCustomEvent, getScrollY, isEscape, assign } from '#platform'

import { targetResolver } from '../targets'
import type { RenderedFrame, ZoomTarget, TargetAdapter } from '../targets/types'
import type { Zoom, ZoomFactory, ZoomOptions, ZoomSelector, ZoomOpenOptions } from '../types'
import { createOverlay, getImagesFromSelectors } from '../utils'
import type { CoordinatedZoom, ZoomCommands } from './bridge'
import { fitTarget } from './geometry'
import { waitForTransition } from './transition'
import type {
  EngineStrategies,
  Scene,
  ContentContext,
  GallerySource,
  RendererHooks,
  LegacyAdapter,
} from './types'

export const createEngine = (
  strategies: EngineStrategies,
  renderer?: RendererHooks,
  legacy?: LegacyAdapter,
  targets?: readonly TargetAdapter[]
): ZoomFactory => {
  const getTargetAdapter = targetResolver(targets)
  const supports = (target: ZoomTarget) => !!getTargetAdapter(target)
  const { loader, viewport: measureViewport } = strategies
  const mediumZoom: ZoomFactory = (
    selector?: ZoomSelector | ZoomOptions,
    options: ZoomOptions = {}
  ) => {
    const Promise = getPromise()

    const _close = () => {
      void zoom.close()
    }

    const disposeFrames = (frames: readonly RenderedFrame[]) =>
      frames.forEach(frame => {
        frame.element.removeEventListener('click', _close)
        frame.dispose()
      })

    const _dispatchEvent = (image: ZoomTarget, type: string) =>
      image.dispatchEvent(createCustomEvent(`medium-zoom:${type}`, { zoom }))

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
        void zoom.close()
      }
    }

    const update = (options: ZoomOptions = {}) => {
      const newOptions = options

      if (options.background) {
        overlay.style.background = options.background
      }

      legacy?.update(options, zoomOptions)

      zoomOptions = assign({}, zoomOptions, newOptions)

      images.forEach(image => {
        _dispatchEvent(image, 'update')
      })

      return zoom
    }

    const clone = (options?: ZoomOptions) => mediumZoom(assign({}, zoomOptions, options))

    const attach: Zoom['attach'] = function () {
      const newImages = getImagesFromSelectors(arguments, supports).filter(
        image => images.indexOf(image) === -1
      )

      images = images.concat(newImages)

      eventListeners.forEach(({ type, listener, options }) => {
        newImages.forEach(image => {
          image.addEventListener(type, listener, options)
        })
      })

      newImages.forEach(image => _dispatchEvent(image, 'attach'))
      return zoom
    }

    const detach: Zoom['detach'] = function () {
      if (active.__mz_primary) {
        void close()
      }

      const imagesToDetach =
        arguments.length > 0 ? getImagesFromSelectors(arguments, supports) : images

      imagesToDetach.forEach(image => {
        _dispatchEvent(image, 'detach')
      })

      images = images.filter(image => imagesToDetach.indexOf(image) === -1)
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

    const open = ({ target, trigger }: ZoomOpenOptions = {}) => {
      const current: Scene = {}
      const replacing =
        renderer && target && active.__mz_original && target !== active.__mz_original
          ? active
          : undefined
      const _animate = (target = current.__mz_primary!) => {
        const margin = zoomOptions.margin!
        let viewport = {
          width: document.documentElement.clientWidth - margin * 2,
          height: document.documentElement.clientHeight - margin * 2,
          left: margin,
          top: margin,
        }
        viewport = measureViewport?.(viewport, zoomOptions) || viewport
        const measurement = target.measure(viewport)
        const geometry = fitTarget(measurement, viewport)
        if (geometry) {
          current.__mz_frames!.forEach(frame => {
            if (replacing) {
              current.__mz_view!.prepare(frame, geometry)
            } else {
              frame.apply(geometry)
            }
          })
        }
      }

      return new Promise<Zoom>((resolve, reject) => {
        if (
          (!replacing && active.__mz_original) ||
          replacing?.__mz_closing ||
          (target && images.indexOf(target as ZoomTarget) === -1)
        ) {
          resolve(zoom)
          return
        }
        if (replacing) {
          current.__mz_view = replacing.__mz_view
          replacing.__mz_cancelOpen?.()
          replacing.__mz_closeContent?.()
          clearTimeout(replacing.__mz_scrollTimer || undefined)
          replacing.__mz_original!.classList.remove('medium-zoom-image--hidden')
          current.__mz_outgoing = replacing
            .__mz_frames!.concat(replacing.__mz_outgoing || [])
            .filter(frame => frame.element.isConnected)
          replacing.__mz_nodes!.forEach(node => {
            if (node !== overlay && node.parentNode) {
              node.parentNode.removeChild(node)
            }
          })
        }
        active = current

        let cancelTransition: (() => void) | undefined
        let cancelImage: (() => void) | void
        let frame: number
        const finishOpening = (opened = false) => {
          if (!current.__mz_cancelOpen) {
            return
          }
          current.__mz_cancelOpen = null
          try {
            cancelTransition?.()
            cancelImage?.()
          } catch (error) {
            reject(error)
            opened = false
            void close()
          }
          window.cancelAnimationFrame(frame)
          isAnimating = false
          resolve(zoom)
          if (opened) {
            document.body.classList.add('medium-zoom--opened')
            _dispatchEvent(current.__mz_original!, 'opened')
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
        isAnimating = true
        _dispatchEvent(current.__mz_original!, 'open')
        if (current.__mz_closing) {
          return
        }

        scrollTop = getScrollY()
        const adapter = getTargetAdapter(current.__mz_original)!
        current.__mz_primary = adapter.createFrame(
          current.__mz_original,
          adapter.resolveSource(current.__mz_original),
          renderer ? 'viewport' : 'document'
        )
        current.__mz_frames = [current.__mz_primary]
        if (replacing) {
          current.__mz_primary.setVisible(false)
        }
        current.__mz_nodes = [overlay]

        try {
          if (renderer) {
            current.__mz_view = replacing
              ? replacing.__mz_view
              : renderer.mount({
                  frame: current.__mz_primary,
                  zoom,
                  close: _close,
                  trigger,
                })
            current.__mz_view!.update(current.__mz_primary)
            current.__mz_view!.setLoading(true)
          }
        } catch (error) {
          reject(error)
          finishOpening()
          current.__mz_view?.dispose()
          disposeFrames(current.__mz_frames)
          active = {}
          _updateGlobalEvents(false)
          return
        }
        if (current.__mz_closing) {
          return
        }
        // Keep the backdrop below outgoing frames while a gallery scene is loading.
        const host = current.__mz_view ? current.__mz_view.element : document.body
        if (!replacing) {
          host.appendChild(overlay)
        }
        const content: ContentContext = {
          original: current.__mz_original,
          frame: { element: current.__mz_primary.element, content: current.__mz_primary.content },
          append(node) {
            if (active !== current || current.__mz_closing) {
              return
            }
            host.appendChild(node)
            current.__mz_nodes!.push(node)
          },
        }

        try {
          current.__mz_closeContent = legacy?.content(content, zoomOptions)
        } catch (error) {
          reject(error)
          void close()
          return
        }
        if (current.__mz_closing || active !== current) {
          return
        }

        host.appendChild(current.__mz_primary.element)
        current.__mz_primary.element.addEventListener('click', _close)

        frame = window.requestAnimationFrame(() => {
          document.body.classList.add('medium-zoom--opened')
        })

        current.__mz_original.classList.add('medium-zoom-image--hidden')
        current.__mz_primary.element.classList.add('medium-zoom-image--opened')

        let prepared = false
        const animate = (media?: ZoomTarget) => {
          if (prepared || !current.__mz_cancelOpen || current.__mz_closing || active !== current) {
            return
          }
          prepared = true
          try {
            let target = current.__mz_primary!
            if (media) {
              if (media.isConnected) {
                throw new Error('Expected detached loader content')
              }
              target = target.adopt(media)
              host.appendChild(target.element)
              target.element.addEventListener('click', _close)
              current.__mz_frames!.push(target)
              current.__mz_primary!.content.setAttribute('aria-hidden', 'true')
            }
            const incoming = current.__mz_frames!
            _animate(target)
            current.__mz_view?.setLoading(false)
            if (replacing) {
              current.__mz_outgoing!.forEach(frame =>
                current.__mz_view!.prepare(frame, frame.geometry, true)
              )
              const complete = (error?: unknown) => {
                if (!current.__mz_cancelOpen || active !== current) {
                  return
                }
                cancelTransition = undefined
                disposeFrames(current.__mz_outgoing!)
                current.__mz_outgoing = []
                if (error !== undefined) {
                  reject(error)
                  void close()
                } else {
                  finishOpening(true)
                }
              }
              const transition = current.__mz_primary!.geometry
                ? current.__mz_view?.transition
                : undefined
              if (transition) {
                const direction =
                  images.indexOf(current.__mz_original!) > images.indexOf(replacing.__mz_original!)
                    ? 1
                    : -1
                cancelTransition = transition(
                  {
                    outgoing: current.__mz_outgoing!,
                    incoming,
                    direction,
                  },
                  complete
                )
              } else {
                complete()
              }
            } else {
              cancelTransition = waitForTransition(current.__mz_primary!.element, () =>
                finishOpening(true)
              )
            }
          } catch (error) {
            reject(error)
            void close()
          }
        }

        try {
          if (loader) {
            cancelImage = loader(
              { original: current.__mz_original!, content: current.__mz_primary!.content },
              animate
            )
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
          disposeFrames((current.__mz_frames || []).concat(current.__mz_outgoing || []))
          ;(current.__mz_nodes || []).forEach(node => {
            if (node.parentNode) {
              node.parentNode.removeChild(node)
            }
          })
          const view = current.__mz_view
          active = {}
          closing = undefined
          isAnimating = false
          _updateGlobalEvents(false)
          try {
            view?.dispose()
            resolve(zoom)
          } catch (error) {
            reject(error)
          } finally {
            _dispatchEvent(current.__mz_original!, 'closed')
          }
        }

        // Install completion before dispatching events, whose listeners may interact again.
        if (current.__mz_primary) {
          waitForTransition(current.__mz_primary.element, finishClosing)
        }
        document.body.classList.remove('medium-zoom--opened')
        current.__mz_frames?.forEach(frame => frame.reset())
        try {
          current.__mz_closeContent?.()
        } catch (error) {
          reject(error)
        }
        _dispatchEvent(current.__mz_original!, 'close')
        if (!current.__mz_primary) {
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
    const direct: ZoomCommands = { open, close, toggle, detach }
    let requests = direct
    const zoom: CoordinatedZoom = {
      open: options => requests.open(options),
      close: () => requests.close(),
      toggle: options => requests.toggle(options),
      update,
      clone,
      attach,
      detach: (...selectors) => requests.detach(...selectors),
      __mz$coordinate(owner) {
        if (requests !== direct) {
          throw new Error('Zoom already coordinated')
        }
        const coordinated = owner(direct)
        requests = coordinated
        return () => {
          if (requests === coordinated) {
            requests = direct
          }
        }
      },
      on,
      off,
      getOptions,
      getImages: getImages as Zoom['getImages'],
      // Preserve the legacy declaration; a closed zoom returns null at runtime.
      getZoomedImage: getZoomedImage as Zoom['getZoomedImage'],
    }

    if (renderer) {
      ;(zoom as GallerySource).__mz$modal = true
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
      legacy?.defaults,
      zoomOptions
    )

    const overlay = createOverlay(zoomOptions.background)
    overlay.addEventListener('click', _close)
    legacy?.activate(zoom)

    return zoom
  }

  return mediumZoom
}
