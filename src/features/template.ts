import type { TemplateOptions, ZoomFeature } from 'medium-zoom/core'

import type { FeatureHooks, Session } from '../engine/types'
import { isNode } from '../utils'

interface TemplateSession extends Session {
  __mz_template?: HTMLDivElement
}

export function template(): ZoomFeature<TemplateOptions> {
  const feature: FeatureHooks = {
    defaults: { template: null },
    update(options) {
      if (options.template) {
        options.template = isNode(options.template)
          ? (options.template as HTMLTemplateElement)
          : document.querySelector<HTMLTemplateElement>(options.template)
      }
    },
    mount(session: TemplateSession, options) {
      if (!options.template) {
        return
      }
      const target = isNode(options.template)
        ? (options.template as HTMLTemplateElement)
        : document.querySelector<HTMLTemplateElement>(options.template)!
      session.__mz_template = document.createElement('div')
      session.__mz_template.appendChild(target.content.cloneNode(true))
      document.body.appendChild(session.__mz_template)
      session.__mz_nodes!.push(session.__mz_template)
    },
    closing(session: TemplateSession) {
      if (!session.__mz_template) {
        return
      }
      session.__mz_template.style.transition = parseFloat(
        window.getComputedStyle(session.__mz_zoomed!).transitionDuration
      )
        ? 'opacity 150ms'
        : 'none'
      session.__mz_template.style.opacity = '0'
    },
  }
  return feature as unknown as ZoomFeature<TemplateOptions>
}
