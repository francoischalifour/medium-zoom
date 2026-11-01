import { assign } from '#platform'

import { createZoom } from './engine/create-zoom'
import type { FeatureHooks, RendererHooks, EngineHooks } from './engine/types'
import type {
  FeatureOptions,
  ZoomFactory,
  ZoomFeature,
  ZoomRenderer,
  ZoomSelector,
  ZoomOptions,
} from './types'

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
  const hooks: EngineHooks = {
    __mz_defaults: {},
    __mz_update: noop,
    __mz_viewport: (_options, viewport) => viewport,
    __mz_mount: noop,
    __mz_load: noop,
    __mz_closing: noop,
  }
  features.forEach(feature => assign(hooks.__mz_defaults, feature.__mz_defaults))
  hooks.__mz_update = (options, previous) =>
    features.forEach(feature => feature.__mz_update?.(options, previous))
  hooks.__mz_viewport = (options, viewport) =>
    features.reduce((box, feature) => feature.__mz_viewport?.(options, box) || box, viewport)
  hooks.__mz_mount = (session, options) =>
    features.forEach(feature => feature.__mz_mount?.(session, options))
  hooks.__mz_closing = session => features.forEach(feature => feature.__mz_closing?.(session))
  // There is currently one loading capability; reject conflicts instead of silently dropping one.
  const loaders = features.filter(feature => feature.__mz_load)
  if (loaders.length > 1) {
    throw new Error('Medium Zoom supports one image loader per factory')
  }
  hooks.__mz_load = loaders[0]?.__mz_load || noop
  const transitions = features.filter(feature => feature.__mz_transition)
  if (transitions.length > 1) {
    throw new Error('Medium Zoom supports one image transition per factory')
  }
  hooks.__mz_transition = transitions[0]?.__mz_transition
  const mediumZoom = createZoom(hooks, renderer)
  const factory: ZoomFactory = (selector?: ZoomSelector | ZoomOptions, options?: ZoomOptions) => {
    const zoom = mediumZoom(selector as ZoomSelector, options)
    features.forEach(feature => feature.__mz_setup?.(zoom))
    zoom.clone = options => factory(assign({}, zoom.getOptions(), options))
    return zoom
  }
  return factory
}

// The public signature infers feature options; the engine accepts the internal hooks.
export const createMediumZoom: CreateMediumZoom = createZoomFactory as unknown as CreateMediumZoom
