import { createZoomFactory } from './engine/create-zoom'
import type { FeatureOptions, ZoomFactory, ZoomFeature } from './types'

type CreateMediumZoom = <const Features extends readonly ZoomFeature[] = []>(config?: {
  features?: Features
}) => ZoomFactory<FeatureOptions<Features>>

// The public signature infers feature options; the engine accepts the internal hooks.
export const createMediumZoom: CreateMediumZoom = createZoomFactory as unknown as CreateMediumZoom
