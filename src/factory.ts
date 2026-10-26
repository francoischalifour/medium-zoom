import { assign } from '#platform'

import { createZoom } from './engine/create-zoom'
import type { FeatureHooks, RendererHooks } from './engine/types'
import type { FeatureOptions, ZoomFactory, ZoomFeature, ZoomRenderer } from './types'

type CreateMediumZoom = <const Features extends readonly ZoomFeature[] = []>(config?: {
  renderer?: ZoomRenderer
  features?: Features
}) => ZoomFactory<FeatureOptions<Features>>

const noop = () => undefined

const createZoomFactory = ({
  features = [],
  renderer,
}: { features?: readonly FeatureHooks[]; renderer?: RendererHooks } = {}): ZoomFactory => {
  // A factory keeps its capabilities even if the caller later edits its array.
  features = features.slice()
  const hooks: Required<FeatureHooks> = {
    __mz_defaults: {},
    __mz_update: noop,
    __mz_viewport: (_options, viewport) => viewport,
    __mz_mount: noop,
    __mz_load: noop,
    __mz_closing: noop,
  }
  features.forEach(feature => {
    const defaults = assign(hooks.__mz_defaults!, feature.__mz_defaults)
    assign(hooks, feature)
    hooks.__mz_defaults = defaults
  })
  hooks.__mz_update = (options, previous) => {
    features.forEach(feature => {
      if (feature.__mz_update) {
        feature.__mz_update(options, previous)
      }
    })
  }
  return createZoom(hooks, renderer)
}

// The public signature infers feature options; the engine accepts the internal hooks.
export const createMediumZoom: CreateMediumZoom = createZoomFactory as unknown as CreateMediumZoom
