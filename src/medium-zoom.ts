import { updateTemplate, mountTemplate } from './content/template'
import { createEngine } from './engine/create-zoom'
import { loadHdImage } from './loaders/hd-image'
import type { ZoomFactory } from './types'
import { updateContainer, getContainerViewport } from './viewport/container'

// Full builds have fixed capabilities, so they can omit configurable composition.
const mediumZoom: ZoomFactory = createEngine(loadHdImage, getContainerViewport, undefined, {
  defaults: { container: null, template: null },
  content: mountTemplate,
  update(options, previous) {
    updateContainer(options, previous)
    updateTemplate(options)
  },
})

export default mediumZoom
export type { Zoom, ZoomOptions, ZoomSelector, ZoomContainer, ZoomOpenOptions } from './types'
