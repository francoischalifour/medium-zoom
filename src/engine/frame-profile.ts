import type { FrameSurface, TargetAdapter, ZoomTarget } from '../targets/types'
import type { Bounds, FrameGeometry } from './geometry'

export interface TargetRegistry {
  supports(target: ZoomTarget): boolean
  create(target: ZoomTarget, coordinates: 'document' | 'viewport'): FrameSurface
}

/** Static implementation boundary. Profiles share one engine and its lifecycle sequencing. */
export interface FrameProfile {
  readonly extendedFrames: boolean
  readonly legacyPolicy: boolean
  readonly customTargets: boolean
  targetResolver(adapters?: readonly TargetAdapter[]): TargetRegistry
  adoptFrame(frame: FrameSurface, content: ZoomTarget): FrameSurface
  positionFrames(
    frames: readonly FrameSurface[],
    target: FrameSurface,
    viewport: Bounds,
    prepare?: (frame: FrameSurface, geometry: FrameGeometry) => void
  ): void
  frameGeometry(frame: FrameSurface): FrameGeometry | null
  showFrame(frame: FrameSurface, visible: boolean): void
  resetFrame(frame: FrameSurface): void
  disposeFrame(frame: FrameSurface): void
}
