import type { ZoomSelector } from './engine'
import { isImage, type ZoomTarget } from './frame'

export const isNode = (selector: unknown): selector is ZoomTarget =>
  !!selector && (selector as Node).nodeType === 1

export const getImagesFromSelectors = (
  selectors: ArrayLike<ZoomSelector>,
  include: (image: ZoomTarget) => boolean
): ZoomTarget[] => {
  const images: ZoomTarget[] = []
  const unique = selectors.length === 1 && !Array.isArray(selectors[0])
  const collect = (image: ZoomTarget) => {
    if (
      image &&
      isImage(image) &&
      include(image) &&
      (unique || images.indexOf(image) === -1)
    ) {
      images.push(image)
    }
  }
  Array.prototype.forEach.call(selectors, (selector: ZoomSelector) => {
    if (typeof selector === 'string') {
      try {
        selector = document.querySelectorAll(selector)
      } catch {
        throw new TypeError('The provided selector is invalid.')
      }
    }
    if (
      Array.isArray(selector) ||
      NodeList.prototype.isPrototypeOf(selector as object)
    ) {
      Array.prototype.forEach.call(selector, collect)
    } else if (isNode(selector)) {
      collect(selector)
    }
  })
  return images
}

export const createOverlay = (
  background: string | undefined
): HTMLDivElement => {
  const overlay = document.createElement('div')
  overlay.classList.add('medium-zoom-overlay')
  overlay.style.background = background || ''

  return overlay
}

/** Computed on each call, so it follows whatever sets the page's theme. */
export const pageBackground = (): string => {
  for (const node of [document.body, document.documentElement]) {
    const color = getComputedStyle(node).backgroundColor
    // A transparent background computes to `rgba(…, 0)`: the color comes from further up.
    if (!color.endsWith(', 0)')) {
      return color
    }
  }
  return 'Canvas'
}

export function removeNode(node: Node): void {
  const parent = node.parentNode
  if (parent) {
    parent.removeChild(node)
  }
}
