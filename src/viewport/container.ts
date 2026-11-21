import type { ZoomBounds, ZoomViewport } from 'medium-zoom/core'

import { assign } from '#platform'

import type { ZoomOptions } from '../medium-zoom'
import { isNode } from '../utils'

/**
 * Explicit bounds to fit the zoomed image in, in viewport pixels. `width` and `height`
 * default to the window's; `top`, `right`, `bottom` and `left` inset them.
 */
export interface ZoomContainer {
  width?: number
  height?: number
  top?: number
  bottom?: number
  right?: number
  left?: number
}

export interface ContainerOptions {
  /**
   * The element, selector, or bounds the zoomed image fits in.
   *
   * @default null
   */
  container?: string | HTMLElement | ZoomContainer | null
}

export const updateContainer = (options: ZoomOptions, previous: ZoomOptions): void => {
  if (options.container && options.container instanceof Object && !isNode(options.container)) {
    options.container = assign({}, previous.container, options.container)
  }
}

export const getContainerViewport = (viewport: ZoomBounds, options: ZoomOptions): ZoomBounds => {
  const target = options.container
  if (!target) {
    return viewport
  }
  const margin = options.margin!
  if (target instanceof Object && !isNode(target)) {
    const box = assign(
      {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
      },
      target
    )
    return {
      width: box.width - box.left - box.right - margin * 2 || box.width - margin * 2,
      height: box.height - box.top - box.bottom - margin * 2 || box.height - margin * 2,
      left: box.left + margin,
      top: box.top + margin,
    }
  }
  const element = isNode(target) ? target : document.querySelector<HTMLElement>(target)!
  const { width, height, left, top } = element.getBoundingClientRect()
  return {
    width: width - margin * 2,
    height: height - margin * 2,
    left: left + margin,
    top: top + margin,
  }
}

/**
 * Fits the zoomed image in an element, the first element matching a selector, or explicit
 * bounds, measured each time the zoom is positioned. Replaces the v1 `container` option:
 * `createZoom(images, { viewport: containerBounds('#stage') })`.
 */
export function containerBounds(target: string | HTMLElement | ZoomContainer | null): ZoomViewport {
  return (viewport, options) => getContainerViewport(viewport, { ...options, container: target })
}
