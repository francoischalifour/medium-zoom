import type { Bounds, FrameGeometry, TargetMeasurement } from '../engine/geometry'
export type ZoomTarget = HTMLElement | SVGElement
export interface FrameSurface {
  readonly __mz_element: ZoomTarget
  readonly __mz_content: ZoomTarget
}
export interface PreparedFrame {
  readonly element: ZoomTarget
  readonly content: ZoomTarget
  readonly geometry: FrameGeometry
}
export interface RenderedFrame extends FrameSurface {
  readonly __mz_geometry: FrameGeometry | null
  readonly __mz_label: string
  __mz_measure(viewport: Bounds): TargetMeasurement
  __mz_adopt(content: ZoomTarget): RenderedFrame
  __mz_apply(__mz_geometry: FrameGeometry): void
  __mz_setVisible(visible: boolean): void
  __mz_reset(): void
  __mz_dispose(): void
}
export interface TargetAdapter<Target extends ZoomTarget = ZoomTarget, Source = unknown> {
  supports(target: ZoomTarget): target is Target
  resolveSource(target: Target): Source
  createFrame(target: Target, source: Source, coordinates: 'document' | 'viewport'): RenderedFrame
}
export interface PreparedTransition {
  readonly outgoing: readonly PreparedFrame[]
  readonly incoming: readonly PreparedFrame[]
  readonly direction: -1 | 0 | 1
}
/** Prepared frame references are a lease: they become stale when the signal aborts. */
export interface GalleryTransitionContext extends PreparedTransition {
  readonly signal: AbortSignal
}
export type GalleryTransition = (context: GalleryTransitionContext) => void | PromiseLike<void>
