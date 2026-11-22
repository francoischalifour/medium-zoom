import type { ZoomBounds } from '@/zoom/geometry'

// The contracts both libraries share: what a zoom is, and what a loader and a viewport are.

/** The images to zoom: a CSS selector, an element, a list of elements, or `null` for none. */
export type ZoomSelector =
  string | HTMLElement | HTMLElement[] | NodeList | null

/** Options every zoom accepts, in every entry. Change them later with `zoom.update()`. */
export interface CoreZoomOptions {
  /**
   * The space outside the zoomed image.
   *
   * @default 0
   */
  margin?: number

  /**
   * The background of the overlay.
   *
   * @default the page's background color when the zoom opens; '#fff' in the presets
   */
  background?: string

  /**
   * The number of pixels to scroll to close the zoom.
   *
   * @default 40
   */
  scrollOffset?: number
}

/** Options for `open()` and `toggle()`. */
export interface ZoomOpenOptions {
  /**
   * The attached image to zoom. An image that is not attached is ignored.
   *
   * @default the first attached image
   */
  target?: HTMLElement
}

/**
 * A zoom instance: the images it manages, its options and its open/close lifecycle.
 * Events are dispatched on the images as `medium-zoom:<type>` (`open`, `opened`, `close`,
 * `closed`, `attach`, `detach`, `update`) with `event.detail.zoom`.
 */
export interface ZoomInstance<
  Options extends CoreZoomOptions = CoreZoomOptions,
> {
  /**
   * Opens the zoom. Does nothing while it is already open.
   *
   * @param options - Which image to open.
   * @returns A promise resolving with the zoom once the opening transition ends.
   */
  open(options?: ZoomOpenOptions): Promise<this>

  /**
   * Closes the zoom. Does nothing while it is already closed.
   *
   * @returns A promise resolving with the zoom once the closing transition ends.
   */
  close(): Promise<this>

  /**
   * Closes the zoom when it is open, opens it otherwise.
   *
   * @param options - Which image to open.
   * @returns A promise resolving with the zoom once the transition ends.
   */
  toggle(options?: ZoomOpenOptions): Promise<this>

  /**
   * Attaches images to the zoom. Images already attached are skipped; non-images are ignored.
   *
   * @param selectors - The images to attach.
   * @returns The zoom.
   */
  attach(...selectors: ZoomSelector[]): this

  /**
   * Releases images from the zoom, closing it first when open. Without selectors, releases all.
   *
   * @param selectors - The images to release.
   * @returns The zoom.
   */
  detach(...selectors: ZoomSelector[]): this

  /**
   * Merges options into the current ones.
   *
   * @param options - The options to change.
   * @returns The zoom.
   */
  update(options: Options): this

  /**
   * Creates a new zoom with the current options merged with `options`, and no images.
   *
   * @param options - The options to override.
   * @returns The new zoom.
   */
  clone(options?: Options): this

  /**
   * Registers a `medium-zoom:<type>` listener on every image, current and future.
   *
   * @param type - The event type without its prefix, such as `opened`.
   * @param listener - The function to execute when the event is triggered.
   * @param options - The event listener options (same as [`addEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Parameters))
   * @returns The zoom.
   */
  on(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): this

  /**
   * Unregisters a listener registered with `on()`.
   *
   * @param type - The event type without its prefix, such as `opened`.
   * @param listener - The function to remove from the event target.
   * @param options - The event listener options (same as [`removeEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#Parameters))
   * @returns The zoom.
   */
  off(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): this

  /**
   * Returns the current options, defaults included.
   *
   * @returns The zoom options.
   */
  getOptions(): Options

  /**
   * Returns the attached images, in attach order.
   *
   * @returns The zoom images.
   */
  getImages(): HTMLElement[]

  /**
   * Returns the open image.
   *
   * @returns The current zoomed image, or `null` while the zoom is closed.
   */
  getZoomedImage(): HTMLElement | null
}

/**
 * Creates a zoom on the images matching `selector`. The selector can be omitted:
 * `factory(options)` creates a zoom without images.
 */
export interface ZoomFactory<
  Options extends CoreZoomOptions = CoreZoomOptions,
  Instance extends ZoomInstance<Options> = ZoomInstance<Options>,
> {
  /**
   * @param selector - The images to attach.
   * @param options - The zoom options.
   */
  (selector?: ZoomSelector, options?: Options): Instance
  /** @param options - The zoom options. */
  (options?: Options): Instance
}

export type Cleanup = () => void

/** What a loader works from when a zoom opens. */
export interface ZoomLoadContext {
  /** The attached image the zoom opened from. */
  readonly original: HTMLImageElement
  /**
   * The frame on screen, a clone of `original`. Composed zooms present it before loading;
   * the presets fit it once `ready()` is called.
   */
  readonly clone: HTMLImageElement
}
/**
 * Supplies a higher-resolution image for an opening zoom. Call `ready()` with a detached,
 * loaded image to show it over the frame, or without one to keep the frame. Return a cleanup
 * that cancels loading; the zoom calls it once the image is no longer needed: when the
 * opening ends or is cancelled, or when a stepping scene is replaced or closed.
 */
export type ZoomLoader = (
  context: ZoomLoadContext,
  ready: (image?: HTMLImageElement) => void
) => Cleanup | void
/**
 * Measures where the zoomed image fits, at positioning time. Receives the window bounds
 * minus `margin` and returns the bounds to fit into, in viewport coordinates.
 */
export type ZoomViewport = (
  bounds: ZoomBounds,
  options: Readonly<CoreZoomOptions>
) => ZoomBounds
