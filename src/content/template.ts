import type { ZoomContent } from 'medium-zoom/core'

import type { LegacyContent } from '../engine/create-zoom'
import type { ZoomTarget } from '../engine/frame'
import type { ZoomOptions } from '../medium-zoom'
import { removeNode } from '../utils'

export interface TemplateOptions {
  template?: string | HTMLTemplateElement | null
}

const resolveTemplate = (target: string | HTMLTemplateElement): HTMLTemplateElement | null =>
  typeof target === 'string' ? document.querySelector<HTMLTemplateElement>(target) : target

export const updateTemplate = (options: ZoomOptions): void => {
  if (options.template) {
    options.template = resolveTemplate(options.template)
  }
}

export const mountTemplate = (
  frame: ZoomTarget,
  host: HTMLElement,
  options: ZoomOptions
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
      content.style.transition = parseFloat(window.getComputedStyle(frame).transitionDuration)
        ? 'opacity 150ms'
        : 'none'
      content.style.opacity = '0'
    }
  }
}

/** Optional renderer content: clone authored markup and remove it on host disposal. */
export const templateContent =
  (target: string | HTMLTemplateElement): ZoomContent =>
  ({ element }) => {
    const node = document.createElement('div')
    node.appendChild(resolveTemplate(target)!.content.cloneNode(true))
    element.appendChild(node)
    return () => node.remove()
  }
