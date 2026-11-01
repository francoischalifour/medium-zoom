import type { ZoomOptions } from '../types'

export type Cleanup = () => void
export interface Session {
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
  __mz_defaults?: Partial<ZoomOptions>
  __mz_update?: (options: ZoomOptions, previous: ZoomOptions) => void
  __mz_viewport?: (options: ZoomOptions, viewport: Viewport) => Viewport
  __mz_mount?: (session: Session, options: ZoomOptions) => void
  __mz_load?: (
    session: Session,
    ready: (target?: HTMLImageElement) => void,
    close: () => void
  ) => Cleanup | undefined
  __mz_closing?: (session: Session) => void
}
