import {
  mountTemplate,
  type TemplateOptions,
  updateTemplate,
} from './content/template'
import {
  type CoreZoomOptions,
  createEngine,
  type ZoomFactory,
  type ZoomInstance,
} from './engine/create-zoom'
import { loadHdImage } from './loaders/hd-image'
import {
  type ContainerOptions,
  getContainerViewport,
  updateContainer,
} from './viewport/container'

/** The v1 options: core options plus the container and template the presets always support. */
export interface ZoomOptions
  extends CoreZoomOptions, ContainerOptions, TemplateOptions {}

/** A zoom created by `mediumZoom()`. */
export interface Zoom<
  Options extends CoreZoomOptions = ZoomOptions,
> extends ZoomInstance<Options> {
  /**
   * Returns the current zoomed image.
   *
   * @returns The current zoomed image. A closed zoom returns `null` at runtime; the v1
   * declaration is kept.
   */
  getZoomedImage(): HTMLElement
}

// Full builds have fixed capabilities, so they can omit configurable composition.
/**
 * Attaches a zoom to the images matching `selector`, opening on click and closing on
 * click, scroll, resize and Escape. Loads `data-zoom-src` or `srcset` images in high
 * resolution.
 *
 * @example mediumZoom('[data-zoomable]', { margin: 24 })
 */
const mediumZoom = createEngine<ZoomOptions>(
  loadHdImage,
  getContainerViewport,
  undefined,
  {
    defaults: { container: null, template: null },
    content: mountTemplate,
    update(options, previous) {
      updateContainer(options, previous)
      updateTemplate(options)
    },
  }
) as ZoomFactory<ZoomOptions, Zoom>

export default mediumZoom
export type { ZoomSelector, ZoomOpenOptions } from './engine/create-zoom'
export type { ZoomContainer } from './viewport/container'
