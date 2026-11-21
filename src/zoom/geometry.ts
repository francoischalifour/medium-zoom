/** A box in viewport coordinates, in CSS pixels. */
export interface ZoomBounds {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}
/**
 * Pure positioning: the transform that scales a box up to its intrinsic size without
 * leaving the viewport, then centers it there.
 */
export function fitBox(
  layout: ZoomBounds,
  intrinsicWidth: number,
  intrinsicHeight: number,
  viewport: ZoomBounds
): string | null {
  const { width, height } = layout
  const { width: viewportWidth, height: viewportHeight } = viewport
  if (!width || !height) {
    return null
  }
  const scale = Math.min(
    Math.max(1, (intrinsicWidth || viewportWidth) / width),
    Math.max(1, (intrinsicHeight || viewportHeight) / height),
    viewportWidth / width,
    viewportHeight / height
  )
  const translateX =
    (viewport.left + viewportWidth / 2 - layout.left - width / 2) / scale
  const translateY =
    (viewport.top + viewportHeight / 2 - layout.top - height / 2) / scale
  return `scale(${scale}) translate3d(${translateX}px, ${translateY}px, 0)`
}
