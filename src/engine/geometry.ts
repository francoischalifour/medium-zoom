export interface Bounds {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}
export interface TargetMeasurement {
  readonly layout: Bounds
  readonly painted: Bounds
  readonly intrinsic: { readonly width: number; readonly height: number }
  readonly clip?: Bounds
}
export interface FrameGeometry {
  readonly scale: number
  readonly translateX: number
  readonly translateY: number
  readonly clip?: {
    readonly top: number
    readonly right: number
    readonly bottom: number
    readonly left: number
  }
}

/** Pure positioning. Adapters supply measurement; frames apply the result. */
export function fitTarget(
  { layout, painted, intrinsic, clip }: TargetMeasurement,
  viewport: Bounds
): FrameGeometry | null {
  if (!layout.width || !layout.height || !painted.width || !painted.height) {
    return null
  }
  const scale = Math.min(
    Math.min(Math.max(painted.width, intrinsic.width || viewport.width), viewport.width) /
      painted.width,
    Math.min(Math.max(painted.height, intrinsic.height || viewport.height), viewport.height) /
      painted.height
  )
  const centerX = layout.left + layout.width / 2
  const centerY = layout.top + layout.height / 2
  return {
    scale,
    translateX:
      (viewport.left + viewport.width / 2 - centerX) / scale -
      (painted.left + painted.width / 2 - centerX),
    translateY:
      (viewport.top + viewport.height / 2 - centerY) / scale -
      (painted.top + painted.height / 2 - centerY),
    clip: clip
      ? {
          top: clip.top - layout.top,
          left: clip.left - layout.left,
          right: layout.left + layout.width - clip.left - clip.width,
          bottom: layout.top + layout.height - clip.top - clip.height,
        }
      : undefined,
  }
}
