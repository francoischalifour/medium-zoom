import type { LegacyContent } from '../engine/types'
import type { ZoomTarget } from '../targets/types'
import type { ZoomContent } from '../types'
import type { ZoomOptions } from '../types'
import { removeNode } from '../utils'

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
export function templateContent(target: string | HTMLTemplateElement): ZoomContent {
  return ({ element }) => {
    const node = document.createElement('div')
    node.appendChild(resolveTemplate(target)!.content.cloneNode(true))
    element.appendChild(node)
    return () => node.remove()
  }
}
