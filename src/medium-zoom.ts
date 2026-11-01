import { createZoom } from './engine/create-zoom'
import { updateContainer, getContainerViewport } from './features/container'
import { loadHdImage } from './features/hd-image'
import { updateTemplate, mountTemplate, closeTemplate } from './features/template'
import type { ZoomFactory } from './types'

// Full builds have fixed capabilities, so they can omit configurable composition.
const mediumZoom: ZoomFactory = createZoom({
  __mz_defaults: { container: null, template: null },
  __mz_load: loadHdImage,
  __mz_viewport: getContainerViewport,
  __mz_mount: mountTemplate,
  __mz_closing: closeTemplate,
  __mz_update(options, previous) {
    updateContainer(options, previous)
    updateTemplate(options, previous)
  },
})
export default mediumZoom
export type { Zoom, ZoomOptions, ZoomSelector, ZoomContainer, ZoomOpenOptions } from './types'
