import { extendedFrames, legacyPolicy } from '#engine-profile'
import {
  targetResolver,
  positionFrames,
  adoptFrame,
  frameGeometry,
  showFrame,
  resetFrame,
  disposeFrame,
} from '#engine-profile'
import { getPromise, createCustomEvent, getScrollY, isEscape, assign } from '#platform'

import type { FrameSurface, ZoomTarget, TargetAdapter } from '../targets/types'
import type { Zoom, ZoomFactory, ZoomOptions, ZoomSelector, ZoomOpenOptions } from '../types'
import { createOverlay, getImagesFromSelectors, removeNode } from '../utils'
import type { CoordinatedZoom, ZoomCommands, CommandGate } from './bridge'
import { waitForTransition } from './transition'
import type {
  ZoomLoader,
  ZoomViewport,
  Scene,
  GallerySource,
  RendererHooks,
  LegacyAdapter,
} from './types'

export const createEngine = (
  loader?: ZoomLoader,
  measureViewport?: ZoomViewport,
  renderer?: RendererHooks,
  legacy?: LegacyAdapter,
  targets?: readonly TargetAdapter[]
): ZoomFactory => {
  const registry = targetResolver(targets)
  const supports = registry.supports
  const compatibility = legacyPolicy && (!extendedFrames || legacy)
  const mediumZoom: ZoomFactory = (
    selector?: ZoomSelector | ZoomOptions,
    options: ZoomOptions = {}
  ) => {
    const Promise = getPromise()

    const disposeFrames = (frames: readonly FrameSurface[]) => {
      frames.forEach(frame => {
        if (extendedFrames) {
          frame.__mz_element.removeEventListener('click', _close)
        }
        disposeFrame(frame)
      })
    }

    const _dispatchEvent = (image: ZoomTarget, type: string) => {
      image.dispatchEvent(createCustomEvent(`medium-zoom:${type}`, { zoom }))
    }

    const sourceClick = (event: Event) => {
      const target = event.target as HTMLElement
      if (images.indexOf(target) !== -1) {
        void zoom.toggle({ target })
      } else if (
        !extendedFrames &&
        (target === overlay || active.__mz_frames?.some(frame => frame.__mz_element === target))
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
        void zoom.close()
      }
    }

    const update = (options: ZoomOptions = {}) => {
      const newOptions = options

      if (options.background) {
        overlay.style.background = options.background
      }

      if (compatibility) {
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
      const newImages = getImagesFromSelectors(arguments, supports).filter(
        image => images.indexOf(image) === -1
      )

      if (compatibility && !images.length && newImages.length) {
        document.addEventListener('click', sourceClick)
      }
      images = images.concat(newImages)
      if (compatibility) {
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
        arguments.length > 0 ? getImagesFromSelectors(arguments, supports) : images

      imagesToDetach.forEach(image => {
        if (compatibility) {
          image.classList.remove('medium-zoom-image')
        }
        _dispatchEvent(image, 'detach')
      })

      images = images.filter(image => imagesToDetach.indexOf(image) === -1)
      if (compatibility && !images.length) {
        document.removeEventListener('click', sourceClick)
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

    const open = (options: ZoomOpenOptions = {}) => {
      const target = options.target
      // Re-entrant requests wait until the current renderer has returned its host.
      if (
        renderer &&
        active.__mz_original &&
        (!active.__mz_view || !active.__mz_frames) &&
        !active.__mz_closing
      ) {
        return Promise.resolve().then(() => zoom.open(options))
      }
      const current: Scene = {}
      const replacing =
        renderer && target && active.__mz_original && target !== active.__mz_original
          ? active
          : undefined
      const _animate = (target: FrameSurface) => {
        const margin = zoomOptions.margin!
        let viewport = {
          width: document.documentElement.clientWidth - margin * 2,
          height: document.documentElement.clientHeight - margin * 2,
          left: margin,
          top: margin,
        }
        viewport = extendedFrames
          ? measureViewport?.(viewport, zoomOptions) || viewport
          : measureViewport!(viewport, zoomOptions)
        positionFrames(
          current.__mz_frames!,
          target,
          viewport,
          replacing ? (frame, geometry) => current.__mz_view!.prepare(frame, geometry) : undefined
        )
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
          // Cancellation can synchronously issue a newer request or close this scene.
          if (active !== replacing || replacing.__mz_closing) {
            resolve(zoom)
            return
          }
          replacing.__mz_closeContent?.()
          clearTimeout(replacing.__mz_scrollTimer || undefined)
          replacing.__mz_original!.classList.remove('medium-zoom-image--hidden')
          current.__mz_outgoing = replacing
            .__mz_frames!.concat(replacing.__mz_outgoing || [])
            .filter(frame => frame.__mz_element.isConnected)
          replacing.__mz_closeContent?.(true)
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
        _dispatchEvent(current.__mz_original!, 'open')
        if (!current.__mz_cancelOpen) {
          return
        }

        scrollTop = getScrollY()
        const primary = registry.create(current.__mz_original, renderer ? 'viewport' : 'document')
        current.__mz_frames = [primary]
        if (replacing) {
          showFrame(primary, false)
        }

        try {
          if (renderer) {
            current.__mz_view = replacing
              ? replacing.__mz_view
              : renderer.mount({
                  frame: primary,
                  zoom,
                  close: _close,
                  trigger: options.trigger,
                })
            current.__mz_view!.update(primary)
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
        if (!current.__mz_cancelOpen) {
          return
        }
        // Keep the backdrop below outgoing frames while a gallery scene is loading.
        const host = renderer ? current.__mz_view!.element : document.body
        if (!replacing) {
          host.appendChild(overlay)
        }
        try {
          if (compatibility) {
            current.__mz_closeContent = legacy!.content(primary.__mz_element, host, zoomOptions)
          }
        } catch (error) {
          reject(error)
          void close()
          return
        }
        if (!current.__mz_cancelOpen) {
          return
        }

        host.appendChild(primary.__mz_element)
        if (extendedFrames) {
          primary.__mz_element.addEventListener('click', _close)
        }

        frame = window.requestAnimationFrame(() => {
          document.body.classList.add('medium-zoom--opened')
        })

        current.__mz_original.classList.add('medium-zoom-image--hidden')
        primary.__mz_element.classList.add('medium-zoom-image--opened')

        let prepared = false
        const animate = (media?: ZoomTarget) => {
          if (prepared || !current.__mz_cancelOpen) {
            return
          }
          prepared = true
          try {
            let target = primary
            if (media) {
              if (extendedFrames && media.isConnected) {
                throw new Error('Expected detached loader content')
              }
              target = adoptFrame(target, media)
              host.appendChild(target.__mz_element)
              if (extendedFrames) {
                target.__mz_element.addEventListener('click', _close)
              }
              current.__mz_frames!.push(target)
              if (renderer) {
                current.__mz_view!.update(target, primary)
              }
            }
            const incoming = current.__mz_frames!
            _animate(target)
            if (renderer) {
              current.__mz_view!.setLoading(false)
            }
            if (replacing) {
              current.__mz_outgoing!.forEach(frame =>
                current.__mz_view!.prepare(frame, frameGeometry(frame), true)
              )
              const complete = (error?: unknown) => {
                if (!current.__mz_cancelOpen) {
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
              const transition = frameGeometry(primary) ? current.__mz_view?.transition : undefined
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
              cancelTransition = waitForTransition(primary.__mz_element, () => finishOpening(true))
            }
          } catch (error) {
            reject(error)
            void close()
          }
        }

        try {
          if (!extendedFrames || loader) {
            cancelImage = loader!(
              { original: current.__mz_original!, content: primary.__mz_content },
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
        const primary = current.__mz_frames?.[0]
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
          disposeFrames(
            renderer
              ? (current.__mz_frames || []).concat(current.__mz_outgoing || [])
              : current.__mz_frames || []
          )
          removeNode(overlay)
          const view = renderer && current.__mz_view
          active = {}
          closing = undefined
          _updateGlobalEvents(false)
          try {
            try {
              current.__mz_closeContent?.(true)
            } finally {
              view?.dispose()
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
          waitForTransition(primary.__mz_element, finishClosing)
        }
        document.body.classList.remove('medium-zoom--opened')
        current.__mz_frames?.forEach(frame => resetFrame(frame))
        try {
          current.__mz_closeContent?.()
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
    const direct: ZoomCommands = { open, close, toggle, detach }
    const gate: CommandGate = { __mz_current: direct }
    const zoom: CoordinatedZoom = {
      open: options => gate.__mz_current.open(options),
      close: () => gate.__mz_current.close(),
      toggle: options => gate.__mz_current.toggle(options),
      update,
      clone,
      attach,
      detach: (...selectors) => gate.__mz_current.detach(...selectors),
      __mz_gate: gate,
      on: bindEvents(true),
      off: bindEvents(false),
      getOptions,
      getImages: getImages as Zoom['getImages'],
      // Preserve the legacy declaration; a closed zoom returns null at runtime.
      getZoomedImage: getZoomedImage as Zoom['getZoomedImage'],
    }

    // DOM dismissal still routes through the optional session's command gate.
    const _close = () => {
      void zoom.close()
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
      compatibility ? legacy!.defaults : undefined,
      zoomOptions
    )

    const overlay = createOverlay(zoomOptions.background)
    if (extendedFrames) {
      overlay.addEventListener('click', _close)
    }

    return zoom
  }

  return mediumZoom
}
