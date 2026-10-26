import type { ContainerOptions, ZoomFeature } from 'medium-zoom/core'

import { assign } from '#platform'

import type { FeatureHooks } from '../engine/types'
import { isNode } from '../utils'

export const updateContainer: NonNullable<FeatureHooks['__mz_update']> = (options, previous) => {
  if (options.container && options.container instanceof Object && !isNode(options.container)) {
    options.container = assign({}, previous.container, options.container)
  }
}

export const getContainerViewport: NonNullable<FeatureHooks['__mz_viewport']> = (
  options,
  viewport
) => {
  const target = options.container
  if (!target) {
    return viewport
  }
  const margin = options.margin!
  if (target instanceof Object && !isNode(target)) {
    const box = assign(
      {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
      },
      target
    )
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
}

export function container(): ZoomFeature<ContainerOptions> {
  const feature: FeatureHooks = {
    __mz_defaults: { container: null },
    __mz_update: updateContainer,
    __mz_viewport: getContainerViewport,
  }
  return feature as unknown as ZoomFeature<ContainerOptions>
}
