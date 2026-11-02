import { frameGeometry, applyFrame, showFrame } from '../engine/frame-ops'
import type { FrameGeometry } from '../engine/geometry'
import type { FrameTransition } from '../engine/types'
import type { GalleryTransition, PreparedFrame, FrameSurface } from '../targets/types'

/** Executes a consumer strategy; the engine retains frame disposal and completion ownership. */
export function runGalleryTransition(
  strategy: GalleryTransition,
  frames: FrameTransition,
  done: (error?: unknown) => void
): () => void {
  // Narrow the runtime objects as well as their types before crossing into application code.
  const prepare = (frames: readonly FrameSurface[]): PreparedFrame[] =>
    frames
      .filter(frame => frameGeometry(frame))
      .map(frame => ({
        element: frame.__mz_element,
        content: frame.__mz_content,
        geometry: frameGeometry(frame)!,
      }))
  const controller = new AbortController()
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  let settled = false
  const clearEffects = () =>
    [...frames.outgoing, ...frames.incoming].forEach(frame =>
      frame.__mz_element.getAnimations?.({ subtree: true }).forEach(animation => animation.cancel())
    )
  const finish = (error?: unknown) => {
    if (settled) {
      return
    }
    settled = true
    motion.removeEventListener('change', reduce)
    clearEffects()
    done(error)
  }
  const reduce = () => {
    if (motion.matches) {
      controller.abort()
      finish()
    }
  }
  if (motion.matches) {
    queueMicrotask(() => finish())
  } else {
    motion.addEventListener('change', reduce)
    // Install the cancellation lease before application code can synchronously navigate again.
    queueMicrotask(() => {
      if (settled) {
        return
      }
      try {
        void Promise.resolve(
          strategy({
            outgoing: prepare(frames.outgoing),
            incoming: prepare(frames.incoming),
            direction: frames.direction,
            signal: controller.signal,
          })
        ).then(() => finish(), finish)
      } catch (error) {
        finish(error)
      }
    })
  }
  return () => {
    if (settled) {
      return
    }
    settled = true
    motion.removeEventListener('change', reduce)
    controller.abort()
    clearEffects()
  }
}

/** Modal replacement commits fitted geometry without replaying thumbnail motion. */
export function prepareFrame(
  frame: FrameSurface,
  geometry: FrameGeometry | null,
  outgoing = false
) {
  if (outgoing) {
    frame.__mz_content.setAttribute('aria-hidden', 'true')
  }
  if (!geometry) {
    return
  }
  const element = frame.__mz_element
  const transition = element.style.getPropertyValue('transition')
  const priority = element.style.getPropertyPriority('transition')
  element.style.setProperty('transition', 'none', 'important')
  applyFrame(frame, geometry)
  showFrame(frame, true)
  element.getBoundingClientRect()
  if (transition) {
    element.style.setProperty('transition', transition, priority)
  } else {
    element.style.removeProperty('transition')
  }
}
