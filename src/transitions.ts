import { readGeometry, type FrameGeometry } from './engine/geometry'
import type { SceneTransition } from './renderers'

export interface PreparedFrame {
  readonly element: HTMLElement
  readonly content: HTMLElement
  readonly geometry: FrameGeometry
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

/**
 * Turn an application effect into a transition for `dialog({ transition })`. The dialog
 * keeps ownership of frame removal and completion; this runner owns cancellation,
 * reduced motion and clearing the effect's animations.
 */
export function galleryTransition(strategy: GalleryTransition): SceneTransition {
  return (change, done) => {
    // Narrow the runtime objects as well as their types before crossing into application code.
    const prepare = (frames: typeof change.incoming): PreparedFrame[] =>
      frames.map(({ element, transform }) => ({
        element,
        content: element,
        geometry: readGeometry(transform),
      }))
    const controller = new AbortController()
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    let settled = false
    const clearEffects = () =>
      [...change.outgoing, ...change.incoming].forEach(({ element }) =>
        element.getAnimations?.({ subtree: true }).forEach(animation => animation.cancel())
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
              outgoing: prepare(change.outgoing),
              incoming: prepare(change.incoming),
              direction: change.direction,
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
}
