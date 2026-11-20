import {
  createEngine,
  type CoreZoomOptions,
  type Stage,
  type Zoom as ZoomInstance,
  type ZoomLoader,
  type ZoomSelector,
  type ZoomViewport,
} from './engine/create-zoom'
import { isImage, type Frame, type ZoomTarget } from './engine/frame'

export type {
  CoreZoomOptions,
  ZoomSelector,
  ZoomOpenOptions,
  ZoomLoader,
  ZoomLoadContext,
  ZoomViewport,
} from './engine/create-zoom'

// Rendering strategy is fixed at instance creation.
declare const rendererType: unique symbol
export interface ZoomRenderer {
  readonly [rendererType]: true
}

/** Application-owned content mounted for a renderer host's lifetime. */
export type ZoomContent = (view: {
  readonly element: HTMLElement
  readonly zoom: ModalZoom
  close: () => void
}) => void | (() => void)

export type Zoom<Options extends CoreZoomOptions = CoreZoomOptions> = ZoomInstance<Options>

declare const modalType: unique symbol
/**
 * A zoom created with a renderer. Only a rendered zoom can replace one open image with
 * another, so the gallery and trigger bindings ask for this type.
 */
export interface ModalZoom<
  Options extends CoreZoomOptions = CoreZoomOptions,
> extends Zoom<Options> {
  readonly [modalType]: true
  /** A clone keeps the renderer. */
  clone(options?: Options): ModalZoom<Options>
  attach(...selectors: ZoomSelector[]): ModalZoom<Options>
  detach(...selectors: ZoomSelector[]): ModalZoom<Options>
}
export interface CreateZoomOptions extends CoreZoomOptions {
  renderer?: ZoomRenderer
  loader?: ZoomLoader
  viewport?: ZoomViewport
}

// Application loaders return bare, detached images: give them the frame's presentation.
const adoptMedia = (frame: Frame, media: ZoomTarget): void => {
  if (media.isConnected || !isImage(media)) {
    throw new TypeError('Expected a detached image')
  }
  media.style.cssText = frame.style.cssText
  media.className += ` ${frame.className}`
}

/** Explicit instance composition. Strategies stay fixed; update() changes core options. */
export function createZoom(
  images: ZoomSelector | undefined,
  options: CreateZoomOptions & { renderer: ZoomRenderer }
): ModalZoom
export function createZoom(images?: ZoomSelector, options?: CreateZoomOptions): Zoom
export function createZoom(
  images?: ZoomSelector,
  { renderer, loader, viewport, ...options }: CreateZoomOptions = {}
): Zoom {
  return createEngine(
    loader,
    viewport,
    renderer as unknown as Stage,
    undefined,
    adoptMedia
  )(images, options)
}
