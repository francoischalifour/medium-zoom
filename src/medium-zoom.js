/**
 * Adds a zoom effect on a selection of images when clicked.
 *
 * @param {(string|Object[])} [selector] The images to apply the zoom to
 * @param {number} [options.margin=0] Space outside the zoomed image
 * @param {string} [options.background="#fff"] The color of the overlay
 * @param {number} [options.scrollOffset=48] Number of pixels to scroll to dismiss the zoom
 * @param {boolean} [options.metaClick=true] Enables the action on meta click
 */
const mediumZoom = (selector, {
  margin = 0,
  background = '#fff',
  scrollOffset = 48,
  metaClick = true
} = {}) => {
  require('./medium-zoom.css')

  const SUPPORTED_FORMATS = ['IMG']
  const KEY_ESC = 27
  const KEY_Q = 81
  const CANCEL_KEYS = [KEY_ESC, KEY_Q]

  const isSupported = img => SUPPORTED_FORMATS.includes(img.tagName)
  const isScaled = img => img.naturalWidth !== img.width
  const isListOrCollection = selector =>
    NodeList.prototype.isPrototypeOf(selector) ||
    HTMLCollection.prototype.isPrototypeOf(selector)
  const isNode = selector =>
    (selector && selector.nodeType === 1)

  const getImages = () => {
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

  const createOverlay = () => {
    const overlay = document.createElement('div')
    overlay.classList.add('medium-zoom-overlay')
    overlay.style.backgroundColor = options.background

    return overlay
  }

  const zoom = () => {
    if (!target) return

    const event = new Event('show')
    target.dispatchEvent(event)

    scrollTop = document.documentElement.scrollTop || document.body.scrollTop
    isAnimating = true

    document.body.appendChild(overlay)

    requestAnimationFrame(() => {
      document.body.classList.add('medium-zoom--open')
    })

    target.classList.add('medium-zoom-image--open')

    target.addEventListener('transitionend', onZoomEnd)

    animateTarget()
  }

  const zoomOut = () => {
    if (!target) return

    const event = new Event('hide')
    target.dispatchEvent(event)

    setTimeout(() => {
      isAnimating = true
      document.body.classList.remove('medium-zoom--open')
      target.style.transform = 'none'

      target.addEventListener('transitionend', onZoomOutEnd)
    }, 150)
  }

  const triggerZoom = event => {
    if (!target) {
      target = event ? event.target : images[0]
      zoom()
    } else {
      zoomOut()
    }
  }

  const update = (newOptions = {}) => {
    options = Object.assign({}, options, newOptions)

    if (options.background) {
      overlay.style.backgroundColor = options.background
    }

    return options
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

      if (target) {
        target.removeEventListener('transitionend', doDetach)
      }
    }

    if (!target) {
      doDetach()
    } else {
      zoomOut()
      target.addEventListener('transitionend', doDetach)
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
    target.removeEventListener('transitionend', onZoomEnd)

    const event = new Event('shown')
    target.dispatchEvent(event)
  }

  const onZoomOutEnd = () => {
    if (!target) return

    document.body.removeChild(overlay)
    target.classList.remove('medium-zoom-image--open')

    isAnimating = false
    target.removeEventListener('transitionend', onZoomOutEnd)

    const event = new Event('hidden')
    target.dispatchEvent(event)

    target = null
  }

  const onScroll = () => {
    if (isAnimating || !target) return

    const currentScroll = document.documentElement.scrollTop || document.body.scrollTop

    if (Math.abs(scrollTop - currentScroll) > options.scrollOffset) {
      zoomOut()
    }
  }

  const onDismiss = event => {
    if (CANCEL_KEYS.includes(event.keyCode || event.which)) {
      zoomOut()
    }
  }

  const animateTarget = () => {
    if (!target) return

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    const viewportWidth = windowWidth - (options.margin * 2)
    const viewportHeight = windowHeight - (options.margin * 2)

    const { width, height, naturalWidth = +Infinity, naturalHeight = +Infinity } = target
    const { top, left } = target.getBoundingClientRect()
    const isCenterAligned = Math.abs((windowWidth / 2) - (left + (width / 2))) <= 10

    const scaleX = Math.min(naturalWidth, viewportWidth) / width
    const scaleY = Math.min(naturalHeight, viewportHeight) / height
    const scale = Math.min(scaleX, scaleY) || 1
    const translateX = isCenterAligned
      ? 0
      : (-left + ((viewportWidth - width) / 2) + options.margin) / scale
    const translateY = (-top + ((viewportHeight - height) / 2) + options.margin) / scale

    target.style.transform = `scale(${scale}) translate3d(${translateX}px, ${translateY}px, 0)`
  }

  let options = {
    margin,
    background,
    scrollOffset,
    metaClick
  }

  if (selector instanceof Object) {
    options = Object.assign({}, options, selector)
  }

  const images = getImages(selector)
  const overlay = createOverlay()

  let target = null
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
