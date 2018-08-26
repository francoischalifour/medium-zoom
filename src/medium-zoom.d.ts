declare namespace mediumZoom {
  type ZoomSelector = string | Element | Element[] | NodeList

  interface ZoomOptions {
    margin?: number
    background?: string
    scrollOffset?: number
    container?: string | Element | ZoomContainer
    template?: string | Element
  }

  interface ZoomContainer {
    width?: number
    height?: number
    top?: number
    bottom?: number
    right?: number
    left?: number
  }

  interface ZoomOpenOptions {
    target?: Element
  }

  interface Zoom {
    open(ZoomOpenOptions?): Promise<Zoom>
    close(): Promise<Zoom>
    toggle(ZoomOpenOptions?): Promise<Zoom>
    attach(...selectors: ZoomSelector[]): Zoom
    detach(...selectors: ZoomSelector[]): Zoom
    update(options: ZoomOptions): Zoom
    clone(options?: ZoomOptions): Zoom
    on(type: string, listener: () => void, options?: object): Zoom
    off(type: string, listener: () => void, options?: object): Zoom
    getOptions(): ZoomOptions
    getImages(): Element[]
    getZoomedTarget(): Element
  }
}

declare function mediumZoom(
  selector?: mediumZoom.ZoomSelector,
  options?: mediumZoom.ZoomOptions
): mediumZoom.Zoom

// Seems needed for `mediumZoom(options)` autocomplete on VS Code
declare function mediumZoom(
  options: mediumZoom.ZoomOptions
): mediumZoom.Zoom

export = mediumZoom
export as namespace mediumZoom
