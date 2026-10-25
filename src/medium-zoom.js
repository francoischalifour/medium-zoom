import {
  cloneTarget,
  createCustomEvent,
  createOverlay,
  getImagesFromSelector,
  isNode,
  isSvg,
} from './utils'

const mediumZoom = (selector, options = {}) => {
  /**
   * Ensure the compatibility with IE11 if no Promise polyfill are used.
   */
  const Promise =
    window.Promise ||
    function Promise(fn) {
      function noop() {}
      fn(noop, noop)
    }

  const _dispatchEvent = (image, type) =>
    image.dispatchEvent(createCustomEvent(`medium-zoom:${type}`, { zoom }))

  const _handleClick = event => {
    const { target } = event

    if (target === overlay) {
      close()
      return
    }

    if (images.indexOf(target) === -1) {
      return
    }

    toggle({ target })
  }

  const _handleScroll = () => {
    if (!active.__mz_original) {
      return
    }

    const currentScroll =
      window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0

    // Pinching and panning a magnified page must keep the full-size image open.
    if (
      active.__mz_isPinching ||
      (window.visualViewport && window.visualViewport.scale > active.__mz_viewportScale)
    ) {
      scrollTop = currentScroll
      clearTimeout(active.__mz_scrollTimer)
      active.__mz_scrollTimer = null
      return
    }

    if (isAnimating) return

    if (
      Math.abs(scrollTop - currentScroll) > zoomOptions.scrollOffset &&
      !active.__mz_scrollTimer
    ) {
      active.__mz_scrollTimer = setTimeout(close, 150)
    }
  }

  const _handleTouch = event => {
    if (event.touches.length >= 2) active.__mz_isPinching = true
    if (active.__mz_isPinching) _handleScroll()

    // Keep protecting the gesture when one finger lifts before the other.
    if (event.touches.length === 0) active.__mz_isPinching = false
  }

  const _handleKeyUp = event => {
    const key = event.key || event.keyCode

    // Close if escape key is pressed
    if (key === 'Escape' || key === 'Esc' || key === 27) {
      close()
    }
  }

  const update = (options = {}) => {
    const newOptions = options

    if (options.background) {
      overlay.style.background = options.background
    }

    if (options.container && options.container instanceof Object) {
      newOptions.container = {
        ...zoomOptions.container,
        ...options.container,
      }
    }

    if (options.template) {
      const template = isNode(options.template)
        ? options.template
        : document.querySelector(options.template)

      newOptions.template = template
    }

    zoomOptions = { ...zoomOptions, ...newOptions }

    images.forEach(image => {
      _dispatchEvent(image, 'update')
    })

    return zoom
  }

  const clone = options => mediumZoom({ ...zoomOptions, ...options })

  let clickListening = false
  const _updateClickListener = () => {
    const enabled = images.length > 0
    if (clickListening === enabled) return

    document[enabled ? 'addEventListener' : 'removeEventListener']('click', _handleClick)
    clickListening = enabled
  }

  const attach = (...selectors) => {
    const newImages = selectors.reduce(
      (imagesAccumulator, currentSelector) => [
        ...imagesAccumulator,
        ...getImagesFromSelector(currentSelector),
      ],
      []
    )

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

  const detach = (...selectors) => {
    if (active.__mz_zoomed) {
      close()
    }

    const imagesToDetach =
      selectors.length > 0
        ? selectors.reduce(
            (imagesAccumulator, currentSelector) => [
              ...imagesAccumulator,
              ...getImagesFromSelector(currentSelector),
            ],
            []
          )
        : images

    imagesToDetach.forEach(image => {
      image.classList.remove('medium-zoom-image')
      _dispatchEvent(image, 'detach')
    })

    images = images.filter(image => imagesToDetach.indexOf(image) === -1)
    _updateClickListener()

    return zoom
  }

  const on = (type, listener, options = {}) => {
    const eventType = `medium-zoom:${type}`
    images.forEach(image => {
      image.addEventListener(eventType, listener, options)
    })

    eventListeners.push({ type: eventType, listener, options })

    return zoom
  }

  const off = (type, listener, options = {}) => {
    const eventType = `medium-zoom:${type}`
    images.forEach(image => {
      image.removeEventListener(eventType, listener, options)
    })

    eventListeners = eventListeners.filter(
      eventListener =>
        !(
          eventListener.type === eventType &&
          eventListener.listener.toString() === listener.toString()
        )
    )

    return zoom
  }

  let globalListening = false
  const _updateGlobalEvents = enabled => {
    if (globalListening === enabled) return

    const method = enabled ? 'addEventListener' : 'removeEventListener'
    document[method]('keyup', _handleKeyUp)
    document[method]('scroll', _handleScroll)
    const touchOptions = { passive: true }
    ;['touchstart', 'touchend', 'touchcancel'].forEach(type =>
      document[method](type, _handleTouch, touchOptions)
    )
    window[method]('resize', close)
    globalListening = enabled
  }

  // A transition may be disabled, cancelled, or have no change to animate.
  const _waitForTransition = (image, done) => {
    let timer
    let frame
    let finished = false
    const query = window.matchMedia('(prefers-reduced-motion)')
    const getTime = value => Math.max(...value.split(',').map(parseFloat))
    const finish = event => {
      if (finished || (event && event.propertyName !== 'transform')) return
      cleanup()
      done()
    }
    const motionChange = () => {
      if (query.matches) finish()
    }
    const cleanup = () => {
      finished = true
      clearTimeout(timer)
      window.cancelAnimationFrame(frame)
      image.removeEventListener('transitionend', finish)
      query.removeListener(motionChange)
    }
    image.addEventListener('transitionend', finish)
    query.addListener(motionChange)
    const style = window.getComputedStyle(image)
    // Keep a fallback independent of animation frames, which pause in hidden tabs.
    const duration = (getTime(style.transitionDuration) + getTime(style.transitionDelay)) * 1_000
    timer = setTimeout(finish, Math.max(0, duration) + 50)
    // Let the opening body class update before completing a zero-duration zoom.
    if (duration <= 0) frame = window.requestAnimationFrame(() => finish())
    return cleanup
  }

  const open = ({ target } = {}) => {
    const current = {}
    const _animate = () => {
      let container = {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
      }
      let viewportWidth
      let viewportHeight

      if (zoomOptions.container) {
        if (zoomOptions.container instanceof Object) {
          // The container is given as an object with properties like width, height, left, top
          container = {
            ...container,
            ...zoomOptions.container,
          }

          // We need to adjust custom options like container.right or container.bottom
          viewportWidth =
            container.width - container.left - container.right - zoomOptions.margin * 2
          viewportHeight =
            container.height - container.top - container.bottom - zoomOptions.margin * 2
        } else {
          // The container is given as an element
          const zoomContainer = isNode(zoomOptions.container)
            ? zoomOptions.container
            : document.querySelector(zoomOptions.container)

          const { width, height, left, top } = zoomContainer.getBoundingClientRect()

          container = {
            ...container,
            width,
            height,
            left,
            top,
          }
        }
      }

      viewportWidth = viewportWidth || container.width - zoomOptions.margin * 2
      viewportHeight = viewportHeight || container.height - zoomOptions.margin * 2

      const zoomTarget = current.__mz_zoomedHd || current.__mz_original
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
      const translateX =
        (-left + (viewportWidth - width) / 2 + zoomOptions.margin + container.left) / scale
      const translateY =
        (-top + (viewportHeight - height) / 2 + zoomOptions.margin + container.top) / scale
      const transform = `scale(${scale}) translate3d(${translateX}px, ${translateY}px, 0)`

      current.__mz_zoomed.style.transform = transform

      if (current.__mz_zoomedHd) {
        current.__mz_zoomedHd.style.transform = transform
      }
    }

    return new Promise(resolve => {
      if (active.__mz_original || (target && images.indexOf(target) === -1)) {
        resolve(zoom)
        return
      }
      active = current

      let cancelTransition = () => {}
      let cancelImage = () => {}
      let frame
      const finishOpening = opened => {
        if (!current.__mz_cancelOpen) return
        cancelTransition()
        cancelImage()
        window.cancelAnimationFrame(frame)
        current.__mz_cancelOpen = null
        isAnimating = false
        resolve(zoom)
        if (opened) {
          document.body.classList.add('medium-zoom--opened')
          _dispatchEvent(current.__mz_original, 'opened')
        }
      }
      current.__mz_cancelOpen = finishOpening
      current.__mz_original = target || images[0]
      if (!current.__mz_original) {
        resolve(zoom)
        return
      }
      current.__mz_viewportScale = window.visualViewport ? window.visualViewport.scale : 1
      _updateGlobalEvents(true)
      isAnimating = true
      _dispatchEvent(current.__mz_original, 'open')
      if (current.__mz_closing) return

      scrollTop =
        window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
      current.__mz_zoomed = cloneTarget(current.__mz_original)

      document.body.appendChild(overlay)

      if (zoomOptions.template) {
        const template = isNode(zoomOptions.template)
          ? zoomOptions.template
          : document.querySelector(zoomOptions.template)
        current.__mz_template = document.createElement('div')
        current.__mz_template.appendChild(template.content.cloneNode(true))

        document.body.appendChild(current.__mz_template)
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

      document.body.appendChild(current.__mz_zoomed)

      frame = window.requestAnimationFrame(() => {
        document.body.classList.add('medium-zoom--opened')
      })

      current.__mz_original.classList.add('medium-zoom-image--hidden')
      current.__mz_zoomed.classList.add('medium-zoom-image--opened')

      current.__mz_zoomed.addEventListener('click', close)

      const animate = () => {
        _animate()
        cancelTransition = _waitForTransition(current.__mz_zoomed, () => finishOpening(true))
      }

      const zoomSrc = current.__mz_original.getAttribute('data-zoom-src')
      if (zoomSrc || current.__mz_original.hasAttribute('srcset')) {
        // Cloning a cached image can queue a load for its old source in Firefox.
        // Copy its presentation first, then assign sources after installing handlers.
        const hd = document.createElement('img')
        ;[].slice.call(current.__mz_zoomed.attributes).forEach(({ name, value }) => {
          if (!/^(src|srcset|sizes|loading)$/.test(name)) hd.setAttribute(name, value)
        })
        current.__mz_zoomedHd = hd
        const finishImage = () => {
          cancelImage()
          if (current.__mz_closing) return
          if (hd.naturalWidth) {
            hd.classList.add('medium-zoom-image--opened')
            hd.addEventListener('click', close)
            document.body.appendChild(hd)
          } else {
            console.warn(`Unable to reach the zoom image target ${hd.currentSrc || hd.src}`)
            current.__mz_zoomedHd = null
          }
          animate()
        }
        cancelImage = () => {
          hd.removeEventListener('load', finishImage)
          hd.removeEventListener('error', finishImage)
        }
        hd.addEventListener('load', finishImage)
        hd.addEventListener('error', finishImage)
        if (!zoomSrc) hd.srcset = current.__mz_zoomed.srcset
        hd.src = zoomSrc || current.__mz_zoomed.src
      } else {
        animate()
      }
    })
  }

  const close = () =>
    new Promise(resolve => {
      const current = active
      if (!current.__mz_original || current.__mz_closing) {
        resolve(zoom)
        return
      }

      current.__mz_closing = true
      if (current.__mz_cancelOpen) current.__mz_cancelOpen()
      clearTimeout(current.__mz_scrollTimer)
      isAnimating = true
      const finishClosing = () => {
        current.__mz_original.classList.remove('medium-zoom-image--hidden')
        ;[current.__mz_zoomed, current.__mz_zoomedHd, current.__mz_template, overlay].forEach(
          node => {
            if (!node) return
            node.removeEventListener('click', close)
            if (node.parentNode) node.parentNode.removeChild(node)
          }
        )
        active = {}
        isAnimating = false
        _updateGlobalEvents(false)
        resolve(zoom)
        _dispatchEvent(current.__mz_original, 'closed')
      }

      // Install completion before dispatching events, whose listeners may interact again.
      if (current.__mz_zoomed) _waitForTransition(current.__mz_zoomed, finishClosing)
      document.body.classList.remove('medium-zoom--opened')
      if (current.__mz_zoomed) current.__mz_zoomed.style.transform = ''
      if (current.__mz_zoomedHd) current.__mz_zoomedHd.style.transform = ''
      if (current.__mz_template) {
        current.__mz_template.style.transition = parseFloat(
          window.getComputedStyle(current.__mz_zoomed).transitionDuration
        )
          ? 'opacity 150ms'
          : 'none'
        current.__mz_template.style.opacity = 0
      }
      _dispatchEvent(current.__mz_original, 'close')
      if (!current.__mz_zoomed) finishClosing()
    })

  const toggle = ({ target } = {}) => {
    if (active.__mz_original) {
      return close()
    }

    return open({ target })
  }

  const getOptions = () => zoomOptions

  const getImages = () => images

  const getZoomedImage = () => active.__mz_original || null

  let images = []
  let eventListeners = []
  let isAnimating = false
  let scrollTop = 0
  let zoomOptions = options
  let active = {}

  // If the selector is omitted, it's replaced by the options
  if (Object.prototype.toString.call(selector) === '[object Object]') {
    zoomOptions = selector
  } else if (
    selector ||
    typeof selector === 'string' // to process empty string as a selector
  ) {
    attach(selector)
  }

  // Apply the default option values
  zoomOptions = {
    margin: 0,
    background: '#fff',
    scrollOffset: 40,
    container: null,
    template: null,
    ...zoomOptions,
  }

  const overlay = createOverlay(zoomOptions.background)

  const zoom = {
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
    getZoomedImage,
  }

  return zoom
}

export default mediumZoom
