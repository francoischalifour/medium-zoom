import { getTargetAdapter } from './targets'
import type { ZoomTarget } from './targets/types'
import type { ZoomSelector } from './types'

export const isSupported = (node: ZoomTarget): boolean => !!getTargetAdapter(node)
export const isNode = (selector: unknown): selector is ZoomTarget =>
  !!selector && (selector as Node).nodeType === 1

export const getImagesFromSelector = (selector: unknown): ZoomTarget[] => {
  try {
    if (Array.isArray(selector)) {
      return selector.filter(isSupported)
    }

    if (NodeList.prototype.isPrototypeOf(selector as object)) {
      // Do not use spread operator or Array.from() for IE support
      return (Array.prototype.slice.call(selector) as ZoomTarget[]).filter(isSupported)
    }

    if (isNode(selector)) {
      return [selector].filter(isSupported)
    }

    if (typeof selector === 'string') {
      // Do not use spread operator or Array.from() for IE support
      return (
        Array.prototype.slice.call(document.querySelectorAll(selector)) as ZoomTarget[]
      ).filter(isSupported)
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

export const getImagesFromSelectors = (selectors: ArrayLike<ZoomSelector>): ZoomTarget[] =>
  Array.prototype.reduce.call(
    selectors,
    (images, selector) => (images as ZoomTarget[]).concat(getImagesFromSelector(selector)),
    []
  ) as ZoomTarget[]

export const createOverlay = (background: string | undefined): HTMLDivElement => {
  const overlay = document.createElement('div')
  overlay.classList.add('medium-zoom-overlay')
  overlay.style.background = background || ''

  return overlay
}
