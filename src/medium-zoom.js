const SUPPORTED_FORMATS = ['IMG']
const KEY_ESC = 27
const KEY_Q = 81
const CANCEL_KEYS = [KEY_ESC, KEY_Q]

const isSupported = img =>
  SUPPORTED_FORMATS.includes(img.tagName)

const isScaled = img =>
  img.naturalWidth !== img.width

const isListOrCollection = selector =>
  NodeList.prototype.isPrototypeOf(selector) ||
  HTMLCollection.prototype.isPrototypeOf(selector)

const isNode = selector =>
  (selector && selector.nodeType === 1)

/**
 * Attaches a zoom effect on a selection of images.
 *
 * @param {(string|Object[])} [selector] The images to attach the zoom to
 * @param {number} [options.margin=0] The space outside the zoomed image
 * @param {string} [options.background="#fff"] The color of the overlay
 * @param {number} [options.scrollOffset=48] The number of pixels to scroll to dismiss the zoom
 * @param {boolean} [options.metaClick=true] A boolean to enable the default action on meta click
 * @return The zoom object
 */
const mediumZoom = (selector, {
  margin = 0,
  background = '#fff',
  scrollOffset = 48,
  metaClick = true,
  container
} = {}) => {
  const selectImages = selector => {
    try {
      return Array.isArray(selector)
        ? selector.filter(isSupported)
        : isListOrCollection(selector)
          ? [...selector].filter(isSupported)
          : isNode(selector)
            ? [selector].filter(isSupported)
            : typeof selector === 'string'
              ? [...document.querySelectorAll(selector)].filter(isSupported)
              : [...document.querySelectorAll(
                  SUPPORTED_FORMATS.map(attr => attr.toLowerCase()).join(',')
                )].filter(isScaled)
    } catch (err) {
      throw new TypeError(
        'The provided selector is invalid.\n' +
        'Expects a CSS selector, a Node element, a NodeList, an HTMLCollection or an array.\n' +
        'See: https://github.com/francoischalifour/medium-zoom'
      )
    }
  }

  const createOverlay = background => {
    const overlay = document.createElement('div')
    overlay.classList.add('medium-zoom-overlay')
    overlay.style.backgroundColor = background

    return overlay
  }

  const cloneTarget = template => {
    const { top, left, width, height } = template.getBoundingClientRect()
    const clone = template.cloneNode()
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0

    clone.removeAttribute('id')
    clone.style.position = 'absolute'
    clone.style.top = `${top + scrollTop}px`
    clone.style.left = `${left + scrollLeft}px`
    clone.style.width = `${width}px`
    clone.style.height = `${height}px`
    clone.style.transform = ''

    return clone
  }

  const zoom = () => {
    if (!target.template) return

    target.template.dispatchEvent(new Event('show'))

    scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
    isAnimating = true
    target.zoomed = cloneTarget(target.template)

    document.body.appendChild(overlay)

    if (options.container) {
      const template = isNode(options.container)
        ? options.container
        : document.querySelector(options.container)
      target.container = document.createElement('div')
      target.container.appendChild(template.content.cloneNode(true))

      document.body.appendChild(target.container)
    }

    document.body.appendChild(target.zoomed)

    requestAnimationFrame(() => {
      document.body.classList.add('medium-zoom--open')
    })

    target.template.style.visibility = 'hidden'
    target.zoomed.classList.add('medium-zoom-image--open')

    target.zoomed.addEventListener('click', zoomOut)
    target.zoomed.addEventListener('transitionend', onZoomEnd)

    if (target.template.getAttribute('data-zoom-target')) {
      target.zoomedHd = target.zoomed.cloneNode()
      target.zoomedHd.src = target.zoomed.getAttribute('data-zoom-target')

      target.zoomedHd.onerror = () => {
        clearInterval(getZoomTargetSize)
        console.error(`Unable to reach the zoom image target ${target.zoomedHd.src}`)
        target.zoomedHd = null
        animateTarget()
      }

      // We need to access the natural size of the full HD
      // target as fast as possible to compute the animation.
      const getZoomTargetSize = setInterval(() => {
        if (target.zoomedHd.naturalWidth) {
          clearInterval(getZoomTargetSize)
          target.zoomedHd.classList.add('medium-zoom-image--open')
          target.zoomedHd.addEventListener('click', zoomOut)
          document.body.appendChild(target.zoomedHd)
          animateTarget()
        }
      }, 10)
    } else {
      animateTarget()
    }
  }

  const zoomOut = (timeout = 0) => {
    const doZoomOut = () => {
      if (isAnimating || !target.template) return

      target.template.dispatchEvent(new Event('hide'))

      isAnimating = true
      document.body.classList.remove('medium-zoom--open')
      target.zoomed.style.transform = ''

      if (target.zoomedHd) {
        target.zoomedHd.style.transform = ''
        target.zoomedHd.removeEventListener('click', zoomOut)
      }

      // Fade out the template so it's not too abrupt
      if (target.container) {
        target.container.style.transition = 'opacity 150ms'
        target.container.style.opacity = 0
      }

      target.zoomed.removeEventListener('click', zoomOut)
      target.zoomed.addEventListener('transitionend', onZoomOutEnd)
    }

    (timeout > 0) ? setTimeout(doZoomOut, timeout) : doZoomOut()
  }

  const triggerZoom = event => {
    if (!target.template) {
      target.template = event ? event.target : images[0]
      zoom()
    } else {
      zoomOut()
    }
  }

  const update = (newOptions = {}) => {
    newOptions.background &&
      (overlay.style.backgroundColor = newOptions.background)

    return Object.assign(options, newOptions)
  }

  const addEventListeners = (type, listener) => {
    images.forEach(image => {
      image.addEventListener(type, listener)
    })
  }

  const detach = () => {
    const doDetach = () => {
      const event = new Event('detach')

      images.forEach(image => {
        image.classList.remove('medium-zoom-image')
        image.removeEventListener('click', onClick)
        image.dispatchEvent(event)
      })

      images.splice(0, images.length)
      overlay.removeEventListener('click', zoomOut)
      document.removeEventListener('scroll', onScroll)
      document.removeEventListener('keyup', onDismiss)
      window.removeEventListener('resize', zoomOut)

      target.zoomed &&
        target.zoomed.removeEventListener('transitionend', doDetach)
    }

    if (!target.zoomed) {
      doDetach()
    } else {
      zoomOut()
      target.zoomed.addEventListener('transitionend', requestAnimationFrame(doDetach))
    }
  }

  const onClick = event => {
    if (event.metaKey || event.ctrlKey) {
      if (options.metaClick) {
        return window.open(
          (event.target.getAttribute('data-original') ||
          event.target.parentNode.href ||
          event.target.src),
          '_blank')
      }
    }

    event.preventDefault()

    triggerZoom(event)
  }

  const onZoomEnd = () => {
    isAnimating = false
    target.zoomed.removeEventListener('transitionend', onZoomEnd)

    target.template.dispatchEvent(new Event('shown'))
  }

  const onZoomOutEnd = () => {
    if (!target.template) return

    target.template.style.visibility = ''
    document.body.removeChild(target.zoomed)
    target.zoomedHd && document.body.removeChild(target.zoomedHd)
    document.body.removeChild(overlay)
    target.zoomed.classList.remove('medium-zoom-image--open')
    target.container && document.body.removeChild(target.container)

    isAnimating = false
    target.zoomed.removeEventListener('transitionend', onZoomOutEnd)

    target.template.dispatchEvent(new Event('hidden'))

    target.template = null
    target.zoomed = null
    target.zoomedHd = null
    target.container = null
  }

  const onScroll = () => {
    if (isAnimating || !target.template) return

    const currentScroll = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0

    if (Math.abs(scrollTop - currentScroll) > options.scrollOffset) {
      zoomOut(150)
    }
  }

  const onDismiss = event => {
    if (CANCEL_KEYS.includes(event.keyCode || event.which)) {
      zoomOut()
    }
  }

  const animateTarget = () => {
    if (!target.template) return

    let containerWidth
    let containerHeight
    let containerLeft = 0
    let containerTop = 0

    if (target.container) {
      const zoomContainer = document.querySelector('[data-zoom-container]') || target.container

      const containerClientRect = zoomContainer.getBoundingClientRect()
      containerWidth = containerClientRect.width
      containerHeight = containerClientRect.height
      containerLeft = containerClientRect.left
      containerTop = containerClientRect.top
    } else {
      containerWidth = window.innerWidth
      containerHeight = window.innerHeight
    }

    const viewportWidth = containerWidth - (options.margin * 2)
    const viewportHeight = containerHeight - (options.margin * 2)

    const zoomTarget = target.zoomedHd || target.template
    const { naturalWidth = viewportWidth, naturalHeight = viewportHeight } = zoomTarget
    const { top, left, width, height } = zoomTarget.getBoundingClientRect()

    const scaleX = Math.min(naturalWidth, viewportWidth) / width
    const scaleY = Math.min(naturalHeight, viewportHeight) / height
    const scale = Math.min(scaleX, scaleY) || 1
    const translateX = (-left + ((viewportWidth - width) / 2) + options.margin + containerLeft) / scale
    const translateY = (-top + ((viewportHeight - height) / 2) + options.margin + containerTop) / scale
    const transform = `scale(${scale}) translate3d(${translateX}px, ${translateY}px, 0)`

    target.zoomed.style.transform = transform
    target.zoomedHd && (target.zoomedHd.style.transform = transform)
  }

  const options = {
    margin,
    background,
    scrollOffset,
    metaClick,
    container
  }

  // If the selector is omitted, it represents the options
  if (selector instanceof Object) {
    Object.assign(options, selector)
  }

  const images = selectImages(selector)
  const overlay = createOverlay(options.background)

  let target = {
    template: null,
    zoomed: null,
    zoomedHd: null,
    container: null
  }
  let scrollTop = 0
  let isAnimating = false

  images.forEach(elem => {
    elem.classList.add('medium-zoom-image')
    elem.addEventListener('click', onClick)
  })
  overlay.addEventListener('click', zoomOut)
  document.addEventListener('scroll', onScroll)
  document.addEventListener('keyup', onDismiss)
  window.addEventListener('resize', zoomOut)

  return {
    show: triggerZoom,
    hide: zoomOut,
    toggle: triggerZoom,
    update,
    addEventListeners,
    detach,
    images,
    options
  }
}

module.exports = mediumZoom
