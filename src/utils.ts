import type { ZoomTarget } from './targets/types'
import type { ZoomSelector } from './types'

export const isNode = (selector: unknown): selector is ZoomTarget =>
  !!selector && (selector as Node).nodeType === 1

export const getImagesFromSelector = (
  selector: unknown,
  supports: (target: ZoomTarget) => boolean
): ZoomTarget[] => {
  try {
    if (Array.isArray(selector)) {
      return selector.filter(supports)
    }

    if (NodeList.prototype.isPrototypeOf(selector as object)) {
      // Do not use spread operator or Array.from() for IE support
      return (Array.prototype.slice.call(selector) as ZoomTarget[]).filter(supports)
    }

    if (isNode(selector)) {
      return [selector].filter(supports)
    }

    if (typeof selector === 'string') {
      // Do not use spread operator or Array.from() for IE support
      return (
        Array.prototype.slice.call(document.querySelectorAll(selector)) as ZoomTarget[]
      ).filter(supports)
    }

    return []
  } catch (err) {
    throw new TypeError(
      'The provided selector is invalid.\n' +
        'Expects a CSS selector, a Node element, a NodeList or an array.\n' +
        'See: https://github.com/francoischalifour/medium-zoom'
    )
  }
}

export const getImagesFromSelectors = (
  selectors: ArrayLike<ZoomSelector>,
  supports: (target: ZoomTarget) => boolean
): ZoomTarget[] =>
  Array.prototype.reduce.call(
    selectors,
    (images, selector) =>
      (images as ZoomTarget[]).concat(getImagesFromSelector(selector, supports)),
    []
  ) as ZoomTarget[]

export const createOverlay = (background: string | undefined): HTMLDivElement => {
  const overlay = document.createElement('div')
  overlay.classList.add('medium-zoom-overlay')
  overlay.style.background = background || ''

  return overlay
}
