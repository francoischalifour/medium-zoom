import { getScrollX, getScrollY } from '#platform'

import type { ZoomSelector } from './types'

export const isSupported = (node: Element): node is HTMLImageElement => node.tagName === 'IMG'

export const isNode = (selector: unknown): selector is HTMLElement =>
  !!selector && (selector as Node).nodeType === 1

export const isSvg = (image: HTMLImageElement): boolean => {
  const source = image.currentSrc || image.src
  return source.substr(-4).toLowerCase() === '.svg'
}

export const getImagesFromSelector = (selector: unknown): HTMLImageElement[] => {
  try {
    if (Array.isArray(selector)) {
      return selector.filter(isSupported)
    }

    if (NodeList.prototype.isPrototypeOf(selector as object)) {
      // Do not use spread operator or Array.from() for IE support
      return (Array.prototype.slice.call(selector) as Element[]).filter(isSupported)
    }

    if (isNode(selector)) {
      return [selector].filter(isSupported)
    }

    if (typeof selector === 'string') {
      // Do not use spread operator or Array.from() for IE support
      return (Array.prototype.slice.call(document.querySelectorAll(selector)) as Element[]).filter(
        isSupported
      )
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

export const getImagesFromSelectors = (selectors: ArrayLike<ZoomSelector>): HTMLImageElement[] =>
  Array.prototype.reduce.call(
    selectors,
    (images, selector) => (images as HTMLImageElement[]).concat(getImagesFromSelector(selector)),
    []
  ) as HTMLImageElement[]

export const createOverlay = (background: string | undefined): HTMLDivElement => {
  const overlay = document.createElement('div')
  overlay.classList.add('medium-zoom-overlay')
  overlay.style.background = background || ''

  return overlay
}

export const cloneTarget = (template: HTMLImageElement): HTMLImageElement => {
  const { top, left, width, height } = template.getBoundingClientRect()
  const clone = template.cloneNode() as HTMLImageElement
  const scrollTop = getScrollY()
  const scrollLeft = getScrollX()

  clone.removeAttribute('id')
  clone.style.position = 'absolute'
  clone.style.top = `${top + scrollTop}px`
  clone.style.left = `${left + scrollLeft}px`
  clone.style.width = `${width}px`
  clone.style.height = `${height}px`
  clone.style.transform = ''

  return clone
}
