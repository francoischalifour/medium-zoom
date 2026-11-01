import type { TemplateOptions, ZoomFeature } from 'medium-zoom/core'

import type { FeatureHooks, Session } from '../engine/types'
import { isNode } from '../utils'

const resolveTemplate = (target: string | HTMLTemplateElement): HTMLTemplateElement | null =>
  isNode(target)
    ? (target as HTMLTemplateElement)
    : document.querySelector<HTMLTemplateElement>(target)

interface TemplateSession extends Session {
  __mz_template?: HTMLDivElement
}

export const updateTemplate: NonNullable<FeatureHooks['__mz_update']> = options => {
  if (options.template) {
    options.template = resolveTemplate(options.template)
  }
}

export const mountTemplate: NonNullable<FeatureHooks['__mz_mount']> = (
  session: TemplateSession,
  options
) => {
  if (!options.template) {
    return
  }
  const target = resolveTemplate(options.template)!
  session.__mz_template = document.createElement('div')
  session.__mz_template.appendChild(target.content.cloneNode(true))
  document.body.appendChild(session.__mz_template)
  session.__mz_nodes!.push(session.__mz_template)
}

export const closeTemplate: NonNullable<FeatureHooks['__mz_closing']> = (
  session: TemplateSession
) => {
  if (!session.__mz_template) {
    return
  }
  session.__mz_template.style.transition = parseFloat(
    window.getComputedStyle(session.__mz_zoomed!).transitionDuration
  )
    ? 'opacity 150ms'
    : 'none'
  session.__mz_template.style.opacity = '0'
}

export function template(): ZoomFeature<TemplateOptions> {
  const feature: FeatureHooks = {
    __mz_defaults: { template: null },
    __mz_update: updateTemplate,
    __mz_mount: mountTemplate,
    __mz_closing: closeTemplate,
  }
  return feature as unknown as ZoomFeature<TemplateOptions>
}
