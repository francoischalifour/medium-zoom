import type { ZoomViewport } from 'medium-zoom/core'

import { getContainerViewport, type ZoomContainer } from '@/zoom/container'

export type { ZoomContainer }

/**
 * Fits the zoomed image in an element, the first element matching a selector, or explicit
 * bounds, measured each time the zoom is positioned. Replaces the v1 `container` option:
 * `createZoom(images, { viewport: containerBounds('#stage') })`.
 */
export function containerBounds(
  target: string | HTMLElement | ZoomContainer | null
): ZoomViewport {
  return (_, options) => getContainerViewport(target, options.margin!)
}
