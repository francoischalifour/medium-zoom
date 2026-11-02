import type { FrameSurface, RenderedFrame, ZoomTarget } from '../targets/types'
import { fitTarget, type Bounds, type FrameGeometry } from './geometry'

// The generic profile delegates target-specific operations. No image/DOM policy lives here.
const rendered = (frame: FrameSurface) => frame as RenderedFrame
export const measureFrame = (frame: FrameSurface, viewport: Bounds) =>
  rendered(frame).__mz_measure(viewport)
export const adoptFrame = (frame: FrameSurface, content: ZoomTarget) =>
  rendered(frame).__mz_adopt(content)
export const applyFrame = (frame: FrameSurface, geometry: FrameGeometry) =>
  rendered(frame).__mz_apply(geometry)
export const frameGeometry = (frame: FrameSurface) => rendered(frame).__mz_geometry
export const frameLabel = (frame: FrameSurface) => rendered(frame).__mz_label
export const showFrame = (frame: FrameSurface, visible: boolean) =>
  rendered(frame).__mz_setVisible(visible)
export const resetFrame = (frame: FrameSurface) => rendered(frame).__mz_reset()
export const disposeFrame = (frame: FrameSurface) => rendered(frame).__mz_dispose()

export function positionFrames(
  frames: readonly FrameSurface[],
  target: FrameSurface,
  viewport: Bounds,
  prepare?: (frame: FrameSurface, geometry: FrameGeometry) => void
): void {
  const geometry = fitTarget(measureFrame(target, viewport), viewport)
  if (geometry) {
    frames.forEach(frame => (prepare ? prepare(frame, geometry) : applyFrame(frame, geometry)))
  }
}
