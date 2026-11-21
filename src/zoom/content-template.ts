import type { ZoomContent } from 'medium-zoom/core'

import { removeNode } from './dom'
import type { LegacyContent } from './engine'
import type { ZoomTarget } from './frame'

export interface TemplateOptions {
  /**
   * The template element, or its selector, whose content is displayed on zoom.
   *
   * @default null
   */
  template?: string | HTMLTemplateElement | null
}

const resolveTemplate = (
  target: string | HTMLTemplateElement
): HTMLTemplateElement | null =>
  typeof target === 'string'
    ? document.querySelector<HTMLTemplateElement>(target)
    : target

export const updateTemplate = (options: TemplateOptions): void => {
  if (options.template) {
    options.template = resolveTemplate(options.template)
  }
}

export const mountTemplate = (
  frame: ZoomTarget,
  host: HTMLElement,
  options: TemplateOptions
): LegacyContent | undefined => {
  if (!options.template) {
    return
  }
  const target = resolveTemplate(options.template)!
  const content = document.createElement('div')
  content.appendChild(target.content.cloneNode(true))
  host.appendChild(content)
  return disposed => {
    if (disposed) {
      removeNode(content)
    } else {
      content.style.transition = parseFloat(
        window.getComputedStyle(frame).transitionDuration
      )
        ? 'opacity 150ms'
        : 'none'
      content.style.opacity = '0'
    }
  }
}

/**
 * Renderer content for `dialog({ content })`: clones the template, or the template matching a
 * selector, into the renderer host on open and removes it on close.
 */
export const templateContent =
  (target: string | HTMLTemplateElement): ZoomContent =>
  ({ element }) => {
    const node = document.createElement('div')
    node.appendChild(resolveTemplate(target)!.content.cloneNode(true))
    element.appendChild(node)
    return () => node.remove()
  }
