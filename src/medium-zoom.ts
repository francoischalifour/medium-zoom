import { updateTemplate, mountTemplate } from './content/template'
import { createEngine } from './engine/create-zoom'
import { loadHdImage } from './loaders/hd-image'
import type { ZoomFactory } from './types'
import { updateContainer, getContainerViewport } from './viewport/container'

// Full builds have fixed capabilities, so they can omit configurable composition.
const mediumZoom: ZoomFactory = createEngine({
  __mz_defaults: { container: null, template: null },
  loader: loadHdImage,
  viewport: (viewport, options) => getContainerViewport(options, viewport),
  __mz_mount: mountTemplate,
  __mz_update(options, previous) {
    updateContainer(options, previous)
    updateTemplate(options)
  },
})
export default mediumZoom
export type { Zoom, ZoomOptions, ZoomSelector, ZoomContainer, ZoomOpenOptions } from './types'
