import type { Zoom, ZoomOptions } from '../types'

export type Cleanup = () => void
export interface Scene {
  __mz_outgoing?: HTMLElement[]
  __mz_zoom?: Zoom
  __mz_navigate?: (target: HTMLImageElement) => Promise<Zoom>
  __mz_refreshHost?: (image: HTMLImageElement, original: HTMLImageElement) => void
  __mz_host?: HTMLElement
  __mz_disposeHost?: Cleanup
  __mz_original?: HTMLImageElement
  __mz_zoomed?: HTMLImageElement
  __mz_nodes?: HTMLElement[]
  __mz_closing?: boolean
  __mz_cancelOpen?: ((opened?: boolean) => void) | null
  __mz_viewportScale?: number
  __mz_isPinching?: boolean
  __mz_scrollTimer?: ReturnType<typeof setTimeout> | null
}

export interface Viewport {
  width: number
  height: number
  left: number
  top: number
}

// Only built-in features implement this contract. The engine owns cancellation.
export interface FeatureHooks {
  __mz_setup?: (zoom: Zoom) => void
  __mz_transition?: (session: Scene, done: () => void) => Cleanup | undefined
  __mz_defaults?: Partial<ZoomOptions>
  __mz_update?: (options: ZoomOptions, previous: ZoomOptions) => void
  __mz_viewport?: (options: ZoomOptions, viewport: Viewport) => Viewport
  __mz_mount?: (session: Scene, options: ZoomOptions) => void
  __mz_load?: (
    session: Scene,
    ready: (target?: HTMLImageElement) => void,
    close: () => void
  ) => Cleanup | undefined
  __mz_closing?: (session: Scene) => void
}

export interface RendererHooks {
  mount: (
    image: HTMLImageElement,
    original: HTMLImageElement,
    close: Cleanup,
    trigger?: HTMLElement
  ) => {
    element: HTMLElement
    dispose: Cleanup
    update?: (image: HTMLImageElement, original: HTMLImageElement) => void
  }
}

export type EngineHooks = Required<Omit<FeatureHooks, '__mz_setup' | '__mz_transition'>> &
  Pick<FeatureHooks, '__mz_transition'>
