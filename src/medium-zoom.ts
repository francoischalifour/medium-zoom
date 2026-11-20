import { updateTemplate, mountTemplate, type TemplateOptions } from './content/template'
import { createEngine, type CoreZoomOptions, type ZoomFactory } from './engine/create-zoom'
import { loadHdImage } from './loaders/hd-image'
import { updateContainer, getContainerViewport, type ContainerOptions } from './viewport/container'

/** The v1 options: core options plus the container and template the presets always support. */
export interface ZoomOptions extends CoreZoomOptions, ContainerOptions, TemplateOptions {}

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
export type { Zoom, ZoomSelector, ZoomOpenOptions } from './engine/create-zoom'
export type { ZoomContainer } from './viewport/container'
