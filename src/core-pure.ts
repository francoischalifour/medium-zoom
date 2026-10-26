import { createMediumZoom as create } from './factory'

// Both core entries use the same opaque feature types, with no runtime style import.
export const createMediumZoom: typeof import('medium-zoom/core').createMediumZoom = create
export type {
  CoreZoomOptions,
  Zoom,
  ZoomFactory,
  ZoomSelector,
  ZoomOpenOptions,
  ZoomFeature,
  ContainerOptions,
  TemplateOptions,
} from 'medium-zoom/core'
