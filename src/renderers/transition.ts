import type { GalleryTransition, PreparedTransition } from '../targets/types'

/** Executes a consumer strategy; the engine retains frame disposal and completion ownership. */
export function runGalleryTransition(
  strategy: GalleryTransition,
  frames: PreparedTransition,
  done: (error?: unknown) => void
): () => void {
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
      void Promise.resolve(strategy({ ...frames, signal: controller.signal })).then(
        () => finish(),
        finish
      )
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
