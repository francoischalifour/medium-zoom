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
  metaClick = true
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
    const { top, left, width } = template.getBoundingClientRect()
    const clone = template.cloneNode()
    clone.removeAttribute('id')
    clone.style.position = 'absolute'
    clone.style.top = `${top + window.scrollY}px`
    clone.style.left = `${left + window.scrollX}px`
    clone.style.width = `${width}px`

    return clone
  }

  const zoom = () => {
    if (!target.template) return

    const event = new Event('show')
    target.template.dispatchEvent(event)

    scrollTop = document.documentElement.scrollTop || document.body.scrollTop
    isAnimating = true
    target.zoomed = cloneTarget(target.template)

    document.body.appendChild(overlay)
    document.body.appendChild(target.zoomed)

    requestAnimationFrame(() => {
      document.body.classList.add('medium-zoom--open')
    })

    target.template.style.visibility = 'hidden'
    target.zoomed.classList.add('medium-zoom-image--open')

    target.zoomed.addEventListener('click', zoomOut)
    target.zoomed.addEventListener('transitionend', onZoomEnd)

    animateTarget()
  }

  const zoomOut = () => {
    setTimeout(() => {
      if (!target.template) return

      const event = new Event('hide')
      target.template.dispatchEvent(event)

      isAnimating = true
      document.body.classList.remove('medium-zoom--open')
      target.zoomed.style.transform = ''

      target.zoomed.removeEventListener('click', zoomOut)
      target.zoomed.addEventListener('transitionend', onZoomOutEnd)
    }, 150)
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
    if (newOptions.background) {
      overlay.style.backgroundColor = newOptions.background
    }

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

      if (target.zoomed) {
        target.zoomed.removeEventListener('transitionend', doDetach)
      }
    }

    if (!target.zoomed) {
      doDetach()
    } else {
      zoomOut()
      target.zoomed.addEventListener('transitionend', doDetach)
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

    const event = new Event('shown')
    target.template.dispatchEvent(event)
  }

  const onZoomOutEnd = () => {
    if (!target.template) return

    target.template.style.visibility = ''
    document.body.removeChild(target.zoomed)
    document.body.removeChild(overlay)
    target.zoomed.classList.remove('medium-zoom-image--open')

    isAnimating = false
    target.zoomed.removeEventListener('transitionend', onZoomOutEnd)

    const event = new Event('hidden')
    target.template.dispatchEvent(event)

    target.template = null
    target.zoomed = null
  }

  const onScroll = () => {
    if (isAnimating || !target.template) return

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
    if (!target.template) return

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    const viewportWidth = windowWidth - (options.margin * 2)
    const viewportHeight = windowHeight - (options.margin * 2)

    const { naturalWidth = +Infinity, naturalHeight = +Infinity } = target.template
    const { top, left, width, height } = target.template.getBoundingClientRect()
    const isCenterAligned = Math.abs((windowWidth / 2) - (left + (width / 2))) <= 10

    const scaleX = Math.min(naturalWidth, viewportWidth) / width
    const scaleY = Math.min(naturalHeight, viewportHeight) / height
    const scale = Math.min(scaleX, scaleY) || 1
    const translateX = isCenterAligned
      ? 0
      : (-left + ((viewportWidth - width) / 2) + options.margin) / scale
    const translateY = (-top + ((viewportHeight - height) / 2) + options.margin) / scale

    target.zoomed.style.transform = `scale(${scale}) translate3d(${translateX}px, ${translateY}px, 0)`
  }

  const options = {
    margin,
    background,
    scrollOffset,
    metaClick
  }

  // If the selector is omitted, it represents the options
  if (selector instanceof Object) {
    Object.assign(options, selector)
  }

  const images = selectImages(selector)
  const overlay = createOverlay(options.background)

  let target = {
    template: null,
    zoomed: null
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
