import { createEngine } from './engine/create-zoom'
import type { RendererHooks, ZoomLoader, ZoomViewport } from './engine/types'
import type { CoreZoomOptions, Zoom as ZoomInstance, ZoomRenderer, ZoomSelector } from './types'

export type {
  CoreZoomOptions,
  ZoomSelector,
  ZoomOpenOptions,
  ZoomRenderer,
  ZoomContent,
} from './types'
export type { ZoomLoader, ZoomLoadContext, ZoomViewport } from './engine/types'
export type Zoom<Options extends CoreZoomOptions = CoreZoomOptions> = ZoomInstance<Options>
export interface CreateZoomOptions extends CoreZoomOptions {
  renderer?: ZoomRenderer
  loader?: ZoomLoader
  viewport?: ZoomViewport
}

/** Explicit instance composition. Strategies stay fixed; update() changes core options. */
export function createZoom(
  images?: ZoomSelector,
  { renderer, loader, viewport, ...options }: CreateZoomOptions = {}
): Zoom {
  return createEngine(loader, viewport, renderer as unknown as RendererHooks)(images, options)
}
