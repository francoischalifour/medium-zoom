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
    image.dispatchEvent(createCustomEvent(`medium-zoom:${type}`, { detail: { zoom } }))

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
    if (isAnimating || !active.original) {
      return
    }

    const currentScroll =
      window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0

    if (Math.abs(scrollTop - currentScroll) > zoomOptions.scrollOffset) {
      clearTimeout(scrollTimer)
      scrollTimer = setTimeout(close, 150)
    }
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

  const clone = (options = {}) => mediumZoom({ ...zoomOptions, ...options })

  const createListenerSync = () => {
    let unregister

    return (enabled, register) => {
      if (enabled) {
        if (!unregister) {
          unregister = register()
        }

        return
      }

      if (unregister) {
        unregister()
        unregister = undefined
      }
    }
  }

  const _syncClickListener = createListenerSync()
  const _updateClickListener = () =>
    _syncClickListener(images.length > 0, () => {
      document.addEventListener('click', _handleClick)
      return () => {
        document.removeEventListener('click', _handleClick)
      }
    })

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
    if (active.zoomed) {
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
    images.forEach(image => {
      image.addEventListener(`medium-zoom:${type}`, listener, options)
    })

    eventListeners.push({ type: `medium-zoom:${type}`, listener, options })

    return zoom
  }

  const off = (type, listener, options = {}) => {
    images.forEach(image => {
      image.removeEventListener(`medium-zoom:${type}`, listener, options)
    })

    eventListeners = eventListeners.filter(
      eventListener =>
        !(
          eventListener.type === `medium-zoom:${type}` &&
          eventListener.listener.toString() === listener.toString()
        )
    )

    return zoom
  }

  const _syncGlobalEvents = createListenerSync()
  const _updateGlobalEvents = enabled =>
    _syncGlobalEvents(enabled, () => {
      document.addEventListener('keyup', _handleKeyUp)
      document.addEventListener('scroll', _handleScroll)
      window.addEventListener('resize', close)

      return () => {
        document.removeEventListener('keyup', _handleKeyUp)
        document.removeEventListener('scroll', _handleScroll)
        window.removeEventListener('resize', close)
      }
    })

  // A transition may never start (for example when closing before the first frame).
  const _waitForTransition = (image, done) => {
    const finish = event => {
      if (event && event.propertyName !== 'transform') return
      cleanup()
      done()
    }
    // Allow the 300ms CSS transition to finish even if no event is delivered.
    const timer = setTimeout(finish, 400)
    const cleanup = () => {
      clearTimeout(timer)
      image.removeEventListener('transitionend', finish)
    }
    image.addEventListener('transitionend', finish)
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

      const zoomTarget = current.zoomedHd || current.original
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

      current.zoomed.style.transform = transform

      if (current.zoomedHd) {
        current.zoomedHd.style.transform = transform
      }
    }

    return new Promise(resolve => {
      if (active.original || (target && images.indexOf(target) === -1)) {
        resolve(zoom)
        return
      }
      active = current

      let cancelTransition = () => {}
      let cancelImage = () => {}
      let frame
      const finishOpening = opened => {
        if (!current.cancelOpen) return
        cancelTransition()
        cancelImage()
        window.cancelAnimationFrame(frame)
        current.cancelOpen = null
        isAnimating = false
        resolve(zoom)
        if (opened) {
          _dispatchEvent(current.original, 'opened')
        }
      }
      current.cancelOpen = finishOpening
      current.original = target || images[0]
      if (!current.original) {
        resolve(zoom)
        return
      }
      _updateGlobalEvents(true)
      scrollTop =
        window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
      isAnimating = true
      current.zoomed = cloneTarget(current.original)

      document.body.appendChild(overlay)

      if (zoomOptions.template) {
        const template = isNode(zoomOptions.template)
          ? zoomOptions.template
          : document.querySelector(zoomOptions.template)
        current.template = document.createElement('div')
        current.template.appendChild(template.content.cloneNode(true))

        document.body.appendChild(current.template)
      }

      // If the selected <img> tag is inside a <picture> tag, set the
      // currently-applied source as the cloned `src=` attribute.
      // (as these might differ, or src= might be unset in some cases)
      if (
        current.original.parentElement &&
        current.original.parentElement.tagName === 'PICTURE' &&
        current.original.currentSrc
      ) {
        current.zoomed.src = current.original.currentSrc
      }

      document.body.appendChild(current.zoomed)

      frame = window.requestAnimationFrame(() => {
        document.body.classList.add('medium-zoom--opened')
      })

      current.original.classList.add('medium-zoom-image--hidden')
      current.zoomed.classList.add('medium-zoom-image--opened')

      current.zoomed.addEventListener('click', close)

      const animate = () => {
        _animate()
        cancelTransition = _waitForTransition(current.zoomed, () => finishOpening(true))
      }

      const zoomSrc = current.original.getAttribute('data-zoom-src')
      if (zoomSrc || current.original.hasAttribute('srcset')) {
        const hd = current.zoomed.cloneNode()
        current.zoomedHd = hd
        const finishImage = () => {
          cancelImage()
          if (current.closing) return
          if (hd.naturalWidth) {
            hd.classList.add('medium-zoom-image--opened')
            hd.addEventListener('click', close)
            document.body.appendChild(hd)
          } else {
            console.warn(`Unable to reach the zoom image target ${hd.currentSrc || hd.src}`)
            current.zoomedHd = null
          }
          animate()
        }
        cancelImage = () => {
          hd.removeEventListener('load', finishImage)
          hd.removeEventListener('error', finishImage)
        }
        hd.addEventListener('load', finishImage)
        hd.addEventListener('error', finishImage)
        hd.removeAttribute('loading')
        hd.removeAttribute('sizes')
        if (zoomSrc) {
          hd.removeAttribute('srcset')
          hd.src = zoomSrc
        }
      } else {
        animate()
      }

      _dispatchEvent(current.original, 'open')
    })
  }

  const close = () =>
    new Promise(resolve => {
      const current = active
      if (!current.original || current.closing) {
        resolve(zoom)
        return
      }

      current.closing = true
      if (current.cancelOpen) current.cancelOpen()
      clearTimeout(scrollTimer)
      isAnimating = true
      const finishClosing = () => {
        current.original.classList.remove('medium-zoom-image--hidden')
        ;[current.zoomed, current.zoomedHd, current.template, overlay].forEach(node => {
          if (!node) return
          node.removeEventListener('click', close)
          if (node.parentNode) node.parentNode.removeChild(node)
        })
        active = {}
        isAnimating = false
        _updateGlobalEvents(false)
        resolve(zoom)
        _dispatchEvent(current.original, 'closed')
      }

      // Install completion before dispatching events, whose listeners may interact again.
      _waitForTransition(current.zoomed, finishClosing)
      document.body.classList.remove('medium-zoom--opened')
      current.zoomed.style.transform = ''
      if (current.zoomedHd) current.zoomedHd.style.transform = ''
      if (current.template) {
        current.template.style.transition = 'opacity 150ms'
        current.template.style.opacity = 0
      }
      _dispatchEvent(current.original, 'close')
    })

  const toggle = ({ target } = {}) => {
    if (active.original) {
      return close()
    }

    return open({ target })
  }

  const getOptions = () => zoomOptions

  const getImages = () => images

  const getZoomedImage = () => active.original || null

  let images = []
  let eventListeners = []
  let isAnimating = false
  let scrollTop = 0
  let zoomOptions = options
  let scrollTimer
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
