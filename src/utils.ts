import type { ZoomSelector } from './engine/create-zoom'
import type { ZoomTarget } from './engine/frame'

export const isNode = (selector: unknown): selector is ZoomTarget =>
  !!selector && (selector as Node).nodeType === 1

export const getImagesFromSelector = (
  selector: unknown,
  supports: (target: ZoomTarget) => boolean
): ZoomTarget[] => {
  try {
    if (typeof selector === 'string') {
      selector = document.querySelectorAll(selector)
    }
    if (isNode(selector)) {
      selector = [selector]
    }
    if (NodeList.prototype.isPrototypeOf(selector as object)) {
      selector = Array.prototype.slice.call(selector)
    }
    return Array.isArray(selector) ? selector.filter(supports) : []
  } catch (err) {
    throw new TypeError('The provided selector is invalid.')
  }
}

export const getImagesFromSelectors = (
  selectors: ArrayLike<ZoomSelector>,
  supports: (target: ZoomTarget) => boolean
): ZoomTarget[] => {
  let images: ZoomTarget[] = []
  for (let index = 0, length = selectors.length; index < length; index++) {
    images = images.concat(getImagesFromSelector(selectors[index], supports))
  }
  return images
}

export const createOverlay = (background: string | undefined): HTMLDivElement => {
  const overlay = document.createElement('div')
  overlay.classList.add('medium-zoom-overlay')
  overlay.style.background = background || ''

  return overlay
}

export function removeNode(node: Node): void {
  const parent = node.parentNode
  if (parent) {
    parent.removeChild(node)
  }
}
