import { assign } from '#platform'
import { isNode, resolveElement } from '@/zoom/dom'
import type { ZoomBounds } from '@/zoom/geometry'

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

export function isBounds(
  target: ContainerOptions['container']
): target is ZoomContainer {
  return target instanceof Object && !isNode(target)
}

/**
 * The bounds to fit into, `margin` inside the container: an element's box, the first one
 * matching a selector, explicit bounds, or the window without a container.
 */
export const getContainerViewport = (
  container: ContainerOptions['container'],
  margin: number
): ZoomBounds => {
  const inset = margin * 2
  if (container && !isBounds(container)) {
    const rect = resolveElement(container)!.getBoundingClientRect()
    return {
      width: rect.width - inset,
      height: rect.height - inset,
      left: rect.left + margin,
      top: rect.top + margin,
    }
  }
  // Explicit bounds default to the window's and inset it.
  const box = assign(
    {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    },
    container
  )
  return {
    width: box.width - box.left - box.right - inset || box.width - inset,
    height: box.height - box.top - box.bottom - inset || box.height - inset,
    left: box.left + margin,
    top: box.top + margin,
  }
}
