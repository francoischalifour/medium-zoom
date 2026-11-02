export type ZoomSelector = string | HTMLElement | HTMLElement[] | NodeList | null

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
   * @default '#fff'
   */
  background?: string

  /**
   * The number of pixels to scroll to close the zoom.
   *
   * @default 40
   */
  scrollOffset?: number
}

export interface ZoomOptions extends CoreZoomOptions, ContainerOptions, TemplateOptions {}

export interface ContainerOptions {
  container?: string | HTMLElement | ZoomContainer | null
}

export interface TemplateOptions {
  template?: string | HTMLTemplateElement | null
}

export interface ZoomContainer {
  width?: number
  height?: number
  top?: number
  bottom?: number
  right?: number
  left?: number
}

export interface ZoomOpenOptions {
  /**
   * The target of the zoom.
   *
   * If not specified, the target is the first image of the zoom.
   *
   * @default null
   */
  target?: HTMLElement

  /** The control that opened the zoom; receives focus when a modal renderer closes. */
  trigger?: HTMLElement
}

export interface Zoom<Options extends CoreZoomOptions = ZoomOptions> {
  /**
   * Opens the zoom.
   *
   * @param options
   * @returns A promise resolving with the zoom.
   */
  open(options?: ZoomOpenOptions): Promise<Zoom<Options>>

  /**
   * Closes the zoom.
   *
   * @returns A promise resolving with the zoom.
   */
  close(): Promise<Zoom<Options>>

  /**
   * Toggles the zoom.
   *
   * @param options
   * @returns A promise resolving with the zoom.
   */
  toggle(options?: ZoomOpenOptions): Promise<Zoom<Options>>

  /**
   * Attaches the images to the zoom.
   *
   * @param selectors - The selectors describing the images.
   * @returns The zoom.
   */
  attach(...selectors: ZoomSelector[]): Zoom<Options>

  /**
   * Releases the images from the zoom.
   *
   * @param selectors - The selectors describing the images.
   * @returns The zoom.
   */
  detach(...selectors: ZoomSelector[]): Zoom<Options>

  /**
   * Updates the options.
   *
   * @param options
   * @returns The zoom.
   */
  update(options: Options): Zoom<Options>

  /**
   * Extends the zoom with the provided options merged with the current ones.
   *
   * @param options
   * @returns The zoom.
   */
  clone(options?: Options): Zoom<Options>

  /**
   * Registers an event handler on each target of the zoom.
   *
   * @param type - The event type to listen for.
   * @param listener - The function to execute when the event is triggered.
   * @param options - The event listener options (same as [`addEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Parameters))
   * @returns The zoom.
   */
  on(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): Zoom<Options>

  /**
   * Unregisters an event handler.
   *
   * @param type - The event type to unregister.
   * @param listener - The function to remove from the event target.
   * @param options - The event listener options (same as [`removeEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#Parameters))
   * @returns The zoom.
   */
  off(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): Zoom<Options>

  /**
   * Returns the zoom options.
   *
   * @returns The zoom options.
   */
  getOptions(): Options

  /**
   * Returns the zoom images.
   *
   * @returns The zoom images.
   */
  getImages(): HTMLElement[]

  /**
   * Returns the current zoomed image.
   *
   * @returns The current zoomed image.
   */
  getZoomedImage(): HTMLElement
}

export interface ZoomFactory<Options extends CoreZoomOptions = ZoomOptions> {
  (selector?: ZoomSelector, options?: Options): Zoom<Options>
  (options?: Options): Zoom<Options>
}

// Rendering strategy is fixed at instance creation.
declare const rendererType: unique symbol
export interface ZoomRenderer {
  readonly [rendererType]: true
}

/** Application-owned content mounted for a renderer host's lifetime. */
export type ZoomContent = (view: {
  readonly element: HTMLElement
  readonly zoom: Zoom<CoreZoomOptions>
  close: () => void
}) => void | (() => void)
