import type { Bounds, FrameGeometry, TargetMeasurement } from '../engine/geometry'
export type ZoomTarget = HTMLElement | SVGElement
interface FrameSurface {
  readonly element: ZoomTarget
  readonly content: ZoomTarget
}
export interface PreparedFrame extends FrameSurface {
  readonly geometry: FrameGeometry
}
export interface RenderedFrame extends FrameSurface {
  readonly geometry: FrameGeometry | null
  readonly label: string
  apply(geometry: FrameGeometry): void
  setVisible(visible: boolean): void
  reset(): void
  dispose(): void
}
export interface TargetAdapter<Target extends ZoomTarget = ZoomTarget, Source = unknown> {
  supports(target: ZoomTarget): target is Target
  resolveSource(target: Target): Source
  measure(target: Target, source: Source, viewport: Bounds): TargetMeasurement
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
