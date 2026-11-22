import type { ZoomContent } from 'medium-zoom/core'

import { resolveElement } from '@/zoom/dom'

/**
 * Renderer content for `dialog({ content })`: clones the template, or the template matching a
 * selector, into the renderer host on open and removes it on close.
 */
export const templateContent =
  (target: string | HTMLTemplateElement): ZoomContent =>
  ({ element }) => {
    const node = document.createElement('div')
    node.appendChild(resolveElement(target)!.content.cloneNode(true))
    element.appendChild(node)
    return () => node.remove()
  }
