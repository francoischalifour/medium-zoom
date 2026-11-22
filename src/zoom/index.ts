import {
  type CoreZoomOptions,
  createEngine,
  type Group,
  type ModalOpenOptions,
  type Stage,
  type ZoomCloseOptions,
  type ZoomCloseReason,
  type ZoomEvent,
  type ZoomEventMap,
  type ZoomInstance,
  type ZoomLoader,
  type ZoomSelector,
  type ZoomState,
  type ZoomViewport,
} from './engine'
import { type Frame, isImage } from './frame'

export type {
  CoreZoomOptions,
  ZoomInstance,
  ModalOpenOptions,
  ZoomSelector,
  ZoomOpenOptions,
  ZoomLoader,
  ZoomLoadContext,
  ZoomViewport,
  ZoomCloseReason,
  ZoomCloseEventMap,
  ZoomCloseDetail,
  ZoomCloseOptions,
  ZoomEvent,
  ZoomEventMap,
  ZoomState,
  ZoomStatus,
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
  /**
   * Closes the zoom for an application control: the close reason is `control`. Pass the
   * DOM event behind it as `event`, or bind it as a listener, to report that event too.
   */
  close: (options?: { readonly event?: Event } | Event) => void
  /**
   * Aborts once the content is removed, after its cleanup: pass it to `addEventListener()`,
   * `createGallery()` and the gallery bindings to release them with the content.
   */
  readonly signal: AbortSignal
}) => void | (() => void)

/**
 * A zoom created by `createZoom()`. See `ModalZoom` for one created with a renderer.
 * `getOptions()` and `getImages()` return copies; `getSnapshot()` returns frozen state.
 */
export interface Zoom<
  Options extends CoreZoomOptions = CoreZoomOptions,
> extends ZoomInstance<Options> {
  /**
   * Returns the current state; the same frozen object until something changes. Compatible
   * with React's `useSyncExternalStore` together with `subscribe()`.
   */
  getSnapshot(this: void): ZoomState
  /** Calls `listener` after every state change. Returns the unsubscribe function. */
  subscribe(this: void, listener: () => void): () => void
  /**
   * Closes the zoom. Does nothing while it is already closed. Never reads `this`, so it can
   * be passed around, as to an event listener.
   *
   * @param options - Why, and the DOM event behind it, as reported by the `close` and
   * `closed` events. The reason defaults to `api`.
   */
  close<Reason extends ZoomCloseReason>(
    this: void,
    options?: ZoomCloseOptions<Reason>
  ): Promise<this>
  /** Registers a `medium-zoom:<type>` listener on every image, current and future. */
  on<Type extends keyof ZoomEventMap>(
    type: Type,
    listener: (event: ZoomEvent<Type>) => void,
    options?: boolean | AddEventListenerOptions
  ): this
  on(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): this
  /** Unregisters a listener registered with `on()`. */
  off<Type extends keyof ZoomEventMap>(
    type: Type,
    listener: (event: ZoomEvent<Type>) => void,
    options?: boolean | AddEventListenerOptions
  ): this
  off(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): this
}

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
  /**
   * Loads an attached image's high-resolution media with the zoom's loader, ahead of
   * opening it, so it shows sharp sooner. Does nothing without a loader.
   */
  preload(target: HTMLElement): void
}

declare const groupType: unique symbol
/**
 * Zooms that open one at a time: opening one first closes the group's open zoom, with the
 * close reason `group`, and waits for it. While it waits, a newer request from the group
 * supersedes it. Create one with `createZoomGroup()`.
 */
export interface ZoomGroup {
  readonly [groupType]: true
}

/**
 * Creates a group of zooms that open one at a time. Every zoom belongs to the document's
 * group unless created with a group of its own, or with `group: null`.
 */
export const createZoomGroup = (): ZoomGroup =>
  ({ __mz_ticket: 0 }) satisfies Group as unknown as ZoomGroup

const documentGroup = createZoomGroup()

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
  /**
   * The zooms this one opens one at a time with.
   *
   * @default the document's group, shared by every zoom created without one; `null` for none
   */
  group?: ZoomGroup | null
  /**
   * Detaches every image when aborted, closing the zoom first, so an effect can release the
   * zoom with the bindings and galleries it passed the same signal to.
   */
  signal?: AbortSignal
}

// Application loaders return bare, detached images: give them the frame's presentation.
const adoptMedia = (frame: Frame, media: HTMLImageElement): void => {
  if (media.isConnected || !isImage(media)) {
    throw new TypeError('ready(): detached image')
  }
  media.style.cssText = frame.style.cssText
  // A loader may already have copied them, as loadHdImage does: add each class once.
  media.classList.add(...frame.classList)
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
  {
    renderer,
    loader,
    viewport,
    signal,
    group = documentGroup,
    ...options
  }: CreateZoomOptions = {}
): Zoom {
  const zoom = createEngine<CoreZoomOptions>(
    loader,
    viewport,
    renderer as unknown as Stage,
    undefined,
    adoptMedia,
    (group || undefined) as Group | undefined
  )(signal?.aborted ? null : images, options) as Zoom
  signal?.addEventListener('abort', () => zoom.detach(), { once: true })
  return zoom
}
