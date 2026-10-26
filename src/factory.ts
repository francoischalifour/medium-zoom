import { createZoomFactory } from './engine/create-zoom'
import type { FeatureHooks } from './engine/types'
import type { FeatureOptions, ZoomFactory, ZoomFeature } from './types'

export function createMediumZoom<const Features extends readonly ZoomFeature[] = []>({
  features = [] as unknown as Features,
}: { features?: Features } = {}): ZoomFactory<FeatureOptions<Features>> {
  return createZoomFactory(
    features as unknown as readonly FeatureHooks[]
  ) as unknown as ZoomFactory<FeatureOptions<Features>>
}
