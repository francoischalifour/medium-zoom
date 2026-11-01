import type { ContentContext } from '../engine/types'
import type { DialogOptions } from '../renderers'
import type { ZoomOptions } from '../types'

const resolveTemplate = (target: string | HTMLTemplateElement): HTMLTemplateElement | null =>
  typeof target === 'string' ? document.querySelector<HTMLTemplateElement>(target) : target

export const updateTemplate = (options: ZoomOptions): void => {
  if (options.template) {
    options.template = resolveTemplate(options.template)
  }
}

export const mountTemplate = (
  { frame, append }: ContentContext,
  options: ZoomOptions
): (() => void) | undefined => {
  if (!options.template) {
    return
  }
  const target = resolveTemplate(options.template)!
  const content = document.createElement('div')
  content.appendChild(target.content.cloneNode(true))
  append(content)
  return () => {
    content.style.transition = parseFloat(window.getComputedStyle(frame.element).transitionDuration)
      ? 'opacity 150ms'
      : 'none'
    content.style.opacity = '0'
  }
}

/** Optional renderer content: clone authored markup and remove it on host disposal. */
export function templateContent(
  target: string | HTMLTemplateElement
): NonNullable<DialogOptions['content']> {
  return ({ element }) => {
    const node = document.createElement('div')
    node.appendChild(resolveTemplate(target)!.content.cloneNode(true))
    element.appendChild(node)
    return () => node.remove()
  }
}
