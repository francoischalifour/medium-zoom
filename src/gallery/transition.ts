import type { SceneChange, SceneTransition } from 'medium-zoom/renderers'

/**
 * The frames leaving and entering the dialog and the gallery direction, plus a signal.
 * Frame references are a lease, valid until the effect settles or the signal aborts.
 */
export interface GalleryTransitionContext extends SceneChange {
  /** Aborts when another navigation, a close or reduced motion interrupts the effect. */
  readonly signal: AbortSignal
}
/**
 * An application effect, such as Web Animations on the frames. Settle the returned promise
 * when it ends, whatever its value; the runner cancels the frames' animations afterwards.
 */
export type GalleryTransition = (
  context: GalleryTransitionContext
) => void | PromiseLike<unknown>

/**
 * Turns an application effect into a transition for `dialog({ transition })`. The dialog
 * keeps ownership of frame removal and completion; this runner owns cancellation, reduced
 * motion (it skips the effect) and clearing the effect's animations.
 */
export function galleryTransition(
  strategy: GalleryTransition
): SceneTransition {
  return (change, done) => {
    const controller = new AbortController()
    const motion = matchMedia('(prefers-reduced-motion)')
    let settled = false
    const stop = () => {
      settled = true
      motion.removeEventListener('change', reduce)
      ;[...change.outgoing, ...change.incoming].forEach(({ element }) =>
        element
          .getAnimations?.({ subtree: true })
          .forEach(animation => animation.cancel())
      )
    }
    const finish = (error?: unknown) => {
      if (!settled) {
        stop()
        done(error)
      }
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
      // Register cancellation first because an effect can navigate again before returning.
      queueMicrotask(() => {
        if (settled) {
          return
        }
        try {
          void Promise.resolve(
            strategy({ ...change, signal: controller.signal })
          ).then(() => finish(), finish)
        } catch (error) {
          finish(error)
        }
      })
    }
    return () => {
      if (!settled) {
        stop()
        controller.abort()
      }
    }
  }
}

/** Options of `slide()`. */
export interface SlideOptions {
  /** How far each image travels, in CSS pixels. @default 8% of the viewport width */
  distance?: number
  /** In milliseconds. @default 220 */
  duration?: number
  /** The zoom's own curve by default. @default "cubic-bezier(0.2, 0, 0.2, 1)" */
  easing?: string
}

/**
 * The images move like a strip: the outgoing one leaves towards the side the user moves away
 * from while the incoming one arrives from the other, both fading. Pass it to
 * `dialog({ transition })`.
 */
export function slide({
  distance,
  duration = 220,
  easing = 'cubic-bezier(0.2, 0, 0.2, 1)',
}: SlideOptions = {}): SceneTransition {
  return galleryTransition(({ outgoing, incoming, direction }) => {
    const options = { duration, easing }
    const offset = direction * (distance ?? innerWidth * 0.08)
    return Promise.all([
      // An end keyframe alone lets an interrupted frame leave from where it was left.
      ...outgoing.map(
        ({ element, transform }) =>
          element.animate(
            {
              opacity: 0,
              transform: `translateX(${-offset}px) ${transform}`,
            },
            options
          ).finished
      ),
      ...incoming.map(
        ({ element, transform }) =>
          element.animate(
            [
              {
                opacity: 0,
                transform: `translateX(${offset}px) ${transform}`,
              },
              { opacity: 1, transform },
            ],
            options
          ).finished
      ),
    ])
  })
}
