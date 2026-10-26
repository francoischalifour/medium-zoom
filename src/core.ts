import type { CoreZoomOptions, Zoom as ZoomInstance, ZoomFactory as Factory } from './types'

export { createMediumZoom } from './factory'
export type {
  CoreZoomOptions,
  ZoomSelector,
  ZoomOpenOptions,
  ZoomFeature,
  ZoomRenderer,
  ContainerOptions,
  TemplateOptions,
} from './types'

export type Zoom<Options extends CoreZoomOptions = CoreZoomOptions> = ZoomInstance<Options>
export type ZoomFactory<Options extends CoreZoomOptions = CoreZoomOptions> = Factory<Options>
