import type {
  EngineZoom,
  ZoomCloseOptions,
  ZoomCloseReason,
} from '@/core/engine'
import type { Frame, ZoomTarget } from '@/zoom/frame'
import type { Cleanup } from '@/zoom/types'

/**
 * The contract between the engine and a renderer: `ZoomRenderer` is its public, opaque type.
 * A stage hosts the frames of an open zoom; the engine fits them and owns their removal.
 */
export interface Stage {
  mount(context: {
    readonly zoom: EngineZoom
    /**
     * Closes the zoom; the reason defaults to `control`. Bound as a listener, it receives
     * the event instead.
     */
    close: (
      reason?: ZoomCloseReason | ZoomCloseOptions | Event,
      event?: Event
    ) => void
    readonly trigger?: HTMLElement
  }): StageView
}
export interface StageView {
  readonly element: HTMLElement
  /**
   * Another scene replaces the one whose frames and source are given: keep them on stage.
   * `stepping` is true when the user moves on without pausing, as while holding an arrow key.
   */
  take(frames: readonly Frame[], source: ZoomTarget, stepping: boolean): void
  /**
   * A frame joined the host, after the backdrop, and is not positioned yet. The stage shows
   * itself here, so the layout that showing forces also measures the frame.
   */
  enter(frame: Frame): void
  /**
   * Frames are fitted. Return a cancellation when the stage presents them itself and
   * calls `done`; return nothing for the engine's own zoom transition.
   */
  present(
    frames: readonly Frame[],
    transform: string | null,
    done: (error?: unknown) => void
  ): Cleanup | void
  dispose(): void
}
