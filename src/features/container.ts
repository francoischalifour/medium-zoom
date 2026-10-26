import { isNode } from '../utils'
import type { ContainerOptions, ZoomFeature } from 'medium-zoom/core'
import type { FeatureHooks } from '../engine/types'

export function container(): ZoomFeature<ContainerOptions> {
  const feature: FeatureHooks = {
    defaults: { container: null },
    update(options, previous) {
      if (options.container && options.container instanceof Object) {
        options.container = { ...(previous.container as object), ...(options.container as object) }
      }
    },
    viewport(options, viewport) {
      const target = options.container
      if (!target) return viewport
      const margin = options.margin!
      if (target instanceof Object) {
        const box = {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          ...(target as object),
        }
        return {
          width: box.width - box.left - box.right - margin * 2 || box.width - margin * 2,
          height: box.height - box.top - box.bottom - margin * 2 || box.height - margin * 2,
          left: box.left + margin,
          top: box.top + margin,
        }
      }
      const element = isNode(target) ? target : document.querySelector<HTMLElement>(target)!
      const { width, height, left, top } = element.getBoundingClientRect()
      return {
        width: width - margin * 2,
        height: height - margin * 2,
        left: left + margin,
        top: top + margin,
      }
    },
  }
  return feature as unknown as ZoomFeature<ContainerOptions>
}
