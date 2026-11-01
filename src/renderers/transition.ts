import type { FrameGeometry } from '../engine/geometry'
import type { FrameTransition } from '../engine/types'
import type { GalleryTransition, PreparedFrame, RenderedFrame } from '../targets/types'

/** Executes a consumer strategy; the engine retains frame disposal and completion ownership. */
export function runGalleryTransition(
  strategy: GalleryTransition,
  frames: FrameTransition,
  done: (error?: unknown) => void
): () => void {
  // Narrow the runtime objects as well as their types before crossing into application code.
  const prepare = (frames: readonly RenderedFrame[]): PreparedFrame[] =>
    frames
      .filter(frame => frame.geometry)
      .map(frame => ({ element: frame.element, content: frame.content, geometry: frame.geometry! }))
  const controller = new AbortController()
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  let settled = false
  const clearEffects = () =>
    [...frames.outgoing, ...frames.incoming].forEach(frame =>
      frame.element.getAnimations?.({ subtree: true }).forEach(animation => animation.cancel())
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
      queueMicrotask(() => finish(error))
    }
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
  frame: RenderedFrame,
  geometry: FrameGeometry | null,
  outgoing = false
) {
  if (outgoing) {
    frame.content.setAttribute('aria-hidden', 'true')
  }
  if (!geometry) {
    return
  }
  const element = frame.element
  const transition = element.style.getPropertyValue('transition')
  const priority = element.style.getPropertyPriority('transition')
  element.style.setProperty('transition', 'none', 'important')
  frame.apply(geometry)
  frame.setVisible(true)
  element.getBoundingClientRect()
  if (transition) {
    element.style.setProperty('transition', transition, priority)
  } else {
    element.style.removeProperty('transition')
  }
}
