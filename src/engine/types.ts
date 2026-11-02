import type { RenderedFrame, ZoomTarget } from '../targets/types'
import type { CoreZoomOptions, Zoom, ZoomOptions } from '../types'
import type { FrameGeometry } from './geometry'

export type Cleanup = () => void
// Per-opening state belongs only to the engine.
export interface Scene {
  __mz_outgoing?: RenderedFrame[]
  __mz_view?: RenderHost
  __mz_closeContent?: Cleanup | void
  __mz_original?: ZoomTarget
  __mz_primary?: RenderedFrame
  __mz_frames?: RenderedFrame[]
  __mz_nodes?: HTMLElement[]
  __mz_closing?: boolean
  __mz_cancelOpen?: ((opened?: boolean) => void) | null
  __mz_viewportScale?: number
  __mz_isPinching?: boolean
  __mz_scrollTimer?: ReturnType<typeof setTimeout> | null
}

export interface ContentContext {
  readonly original: ZoomTarget
  readonly frame: Pick<RenderedFrame, 'element' | 'content'>
  append(this: void, node: HTMLElement): void
}

// This internal capability is the only bridge the headless gallery needs.
export interface GallerySource extends Zoom {
  __mz$modal?: true
}

export interface Viewport {
  width: number
  height: number
  left: number
  top: number
}

/** A loader returns detached media. Adoption, presentation and disposal belong to the engine. */
export interface ZoomLoadContext {
  readonly original: ZoomTarget
  readonly content: ZoomTarget
}
export type ZoomLoader = (
  content: ZoomLoadContext,
  ready: (content?: ZoomTarget) => void
) => Cleanup | void
export type ZoomViewport = (viewport: Viewport, options: Readonly<CoreZoomOptions>) => Viewport
export interface EngineStrategies {
  loader?: ZoomLoader
  viewport?: ZoomViewport
}

/** Closed compatibility adapter, not an extension/install API. */
export interface LegacyAdapter {
  activate: (zoom: Zoom) => void
  defaults: Partial<ZoomOptions>
  update: (options: ZoomOptions, previous: ZoomOptions) => void
  content: (content: ContentContext, options: ZoomOptions) => Cleanup | void
}

export interface FrameTransition {
  readonly outgoing: readonly RenderedFrame[]
  readonly incoming: readonly RenderedFrame[]
  readonly direction: -1 | 0 | 1
}
export interface RenderHost {
  readonly element: HTMLElement
  update(frame: RenderedFrame): void
  prepare(frame: RenderedFrame, geometry: FrameGeometry | null, outgoing?: boolean): void
  transition?: (frames: FrameTransition, done: (error?: unknown) => void) => Cleanup
  setLoading(loading: boolean): void
  dispose(): void
}

export interface RendererHooks {
  mount: (context: {
    readonly frame: RenderedFrame
    readonly zoom: Zoom
    close: Cleanup
    readonly trigger?: HTMLElement
  }) => RenderHost
}
