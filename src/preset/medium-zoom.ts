import {
  mountTemplate,
  type TemplateOptions,
  updateTemplate,
} from '../zoom/content-template'
import {
  type CoreZoomOptions,
  createEngine,
  type ZoomFactory,
  type ZoomInstance,
} from '../zoom/engine'
import { loadHdImage } from '../zoom/hd-image'
import {
  type ContainerOptions,
  getContainerViewport,
  updateContainer,
} from '../zoom/viewport-container'

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
export type { ZoomSelector, ZoomOpenOptions } from '../zoom/engine'
export type { ZoomContainer } from '../zoom/viewport-container'
