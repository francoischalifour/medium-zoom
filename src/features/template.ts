import type { TemplateOptions, ZoomFeature } from 'medium-zoom/core'

import type { FeatureHooks } from '../engine/types'
import { isNode } from '../utils'

const resolveTemplate = (target: string | HTMLTemplateElement): HTMLTemplateElement | null =>
  isNode(target)
    ? (target as HTMLTemplateElement)
    : document.querySelector<HTMLTemplateElement>(target)

export const updateTemplate: NonNullable<FeatureHooks['__mz_update']> = options => {
  if (options.template) {
    options.template = resolveTemplate(options.template)
  }
}

export const mountTemplate: NonNullable<FeatureHooks['__mz_mount']> = (
  { frame, append },
  options
) => {
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

export function template(): ZoomFeature<TemplateOptions> {
  const feature: FeatureHooks = {
    __mz_defaults: { template: null },
    __mz_update: updateTemplate,
    __mz_mount: mountTemplate,
  }
  return feature as unknown as ZoomFeature<TemplateOptions>
}
