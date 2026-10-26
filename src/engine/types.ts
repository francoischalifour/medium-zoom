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
  defaults?: Partial<ZoomOptions>
  update?: (options: ZoomOptions, previous: ZoomOptions) => void
  viewport?: (options: ZoomOptions, viewport: Viewport) => Viewport
  mount?: (session: Session, options: ZoomOptions) => void
  load?: (
    session: Session,
    ready: (target?: HTMLImageElement) => void,
    close: () => void
  ) => Cleanup | undefined
  closing?: (session: Session) => void
}
