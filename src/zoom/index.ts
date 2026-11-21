import {
  type CoreZoomOptions,
  createEngine,
  type ModalOpenOptions,
  type Stage,
  type ZoomInstance,
  type ZoomLoader,
  type ZoomSelector,
  type ZoomViewport,
} from './engine'
import { type Frame, isImage } from './frame'

export type {
  CoreZoomOptions,
  ModalOpenOptions,
  ZoomSelector,
  ZoomOpenOptions,
  ZoomLoader,
  ZoomLoadContext,
  ZoomViewport,
} from './engine'
export type { ZoomBounds } from './geometry'

declare const rendererType: unique symbol
/**
 * Presents an open zoom in a host of its own, such as `dialog()` from `medium-zoom/renderers`.
 * Fixed at creation: pass it to `createZoom(…, { renderer })`.
 */
export interface ZoomRenderer {
  readonly [rendererType]: true
}

/**
 * Application-owned content mounted in the renderer host while the zoom is open, such as
 * `templateContent()` from `medium-zoom/content`. Return a cleanup to run on close.
 */
export type ZoomContent = (view: {
  /** The renderer host. */
  readonly element: HTMLElement
  /** The zoom being presented. */
  readonly zoom: ModalZoom
  /** Closes the zoom, for application controls. */
  close: () => void
}) => void | (() => void)

/** A zoom created by `createZoom()`. See `ModalZoom` for one created with a renderer. */
export type Zoom<Options extends CoreZoomOptions = CoreZoomOptions> =
  ZoomInstance<Options>

declare const modalType: unique symbol
/**
 * A zoom created with a renderer. Only a rendered zoom can replace one open image with
 * another, so the gallery and trigger bindings ask for this type.
 */
export interface ModalZoom<
  Options extends CoreZoomOptions = CoreZoomOptions,
> extends Zoom<Options> {
  readonly [modalType]: true
  /**
   * Opens the zoom, or replaces the open image with `options.target`.
   *
   * @param options - Which image to open and which control to refocus on close.
   */
  open(options?: ModalOpenOptions): Promise<this>
  /**
   * Closes the zoom when it is open, opens it otherwise.
   *
   * @param options - Which image to open and which control to refocus on close.
   */
  toggle(options?: ModalOpenOptions): Promise<this>
  /**
   * Creates a new zoom with the same renderer, the current options merged with `options`,
   * and no images.
   */
  clone(options?: Options): this
}

/**
 * Whatever issues open requests for a rendered zoom: the zoom itself, or a session from
 * `medium-zoom/session` coordinating it with other zooms.
 */
export interface ZoomCommander<
  Options extends CoreZoomOptions = CoreZoomOptions,
> {
  open(options?: ModalOpenOptions): Promise<Zoom<Options>>
}

/** Options of `createZoom()`. The strategies are fixed at creation; `update()` ignores them. */
export interface CreateZoomOptions extends CoreZoomOptions {
  /**
   * Presents the zoom in a host of its own, such as `dialog()` from `medium-zoom/renderers`.
   * Required by galleries, trigger bindings and image replacement.
   *
   * @default none: the zoom is presented in the document body
   */
  renderer?: ZoomRenderer
  /**
   * Supplies a higher-resolution image, such as `loadHdImage` from `medium-zoom/loaders`.
   *
   * @default none: the zoom shows the attached image
   */
  loader?: ZoomLoader
  /**
   * Measures the bounds to fit into, such as `containerBounds()` from `medium-zoom/viewport`.
   *
   * @default the window minus `margin`
   */
  viewport?: ZoomViewport
}

// Application loaders return bare, detached images: give them the frame's presentation.
const adoptMedia = (frame: Frame, media: HTMLImageElement): void => {
  if (media.isConnected || !isImage(media)) {
    throw new TypeError('ready(): detached image')
  }
  media.style.cssText = frame.style.cssText
  media.className += ` ${frame.className}`
}

/**
 * Creates a zoom from explicit strategies. Unlike the `medium-zoom` default export, it does
 * not open on image clicks: call `open()`, or bind `bindZoomTriggers()` from `medium-zoom/triggers`.
 *
 * @param images - The images to attach.
 * @param options - Core options and the fixed strategies.
 */
export function createZoom(
  images: ZoomSelector | undefined,
  options: CreateZoomOptions & { renderer: ZoomRenderer }
): ModalZoom
export function createZoom(
  images?: ZoomSelector,
  options?: CreateZoomOptions
): Zoom
export function createZoom(
  images?: ZoomSelector,
  { renderer, loader, viewport, ...options }: CreateZoomOptions = {}
): Zoom {
  return createEngine<CoreZoomOptions>(
    loader,
    viewport,
    renderer as unknown as Stage,
    undefined,
    adoptMedia
  )(images, options)
}
