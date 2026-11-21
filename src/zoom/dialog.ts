import type { ModalZoom, ZoomContent, ZoomRenderer } from 'medium-zoom/core'

import type { Stage } from './engine'
import type { Frame } from './frame'

/** A frame on stage with the transform that fits it. */
export interface StagedFrame {
  readonly element: HTMLElement
  /**
   * The CSS transform applied to the frame: the fitted one, or wherever an interrupted change
   * left it. Prepend screen-space offsets, such as `translateX(8px) ${transform}`.
   */
  readonly transform: string
}
/** One scene replacing another inside the dialog. */
export interface SceneChange {
  /**
   * The frames of the replaced images; the dialog removes them once the change settles.
   * After an interruption they are held where they were, so animate them towards an end
   * state rather than from a fixed starting keyframe.
   */
  readonly outgoing: readonly StagedFrame[]
  /** The frames of the new image. */
  readonly incoming: readonly StagedFrame[]
  /** `1` when the new image comes after the replaced one in attach order, else `-1`. */
  readonly direction: -1 | 1
}
/**
 * Presents a scene change and calls `done` when it settles; returns its cancellation.
 * Build one from an application effect with `galleryTransition` from
 * `medium-zoom/transitions`.
 */
export type SceneTransition = (
  change: SceneChange,
  done: (error?: unknown) => void
) => () => void

const frameLabel = (frame: Frame) =>
  frame.alt.trim() || frame.getAttribute('aria-label')?.trim() || ''

/** Options of `dialog()`. */
export interface DialogOptions {
  /**
   * The accessible dialog name.
   *
   * @default the image's alt text or aria-label, then "Zoomed image"
   */
  label?: string
  /**
   * How one image replaces another while the dialog stays open, such as `slide()` from
   * `medium-zoom/transitions`. Quick successive changes, as while holding an arrow key,
   * swap at once so effects never pile up.
   *
   * @default instant
   */
  transition?: SceneTransition
  /** Mounts application-owned content inside the modal, such as `templateContent()`. */
  content?: ZoomContent
}

/**
 * Presents the zoom in a native modal `<dialog>`: focus stays inside, Escape and `method="dialog"`
 * forms close it, and on close focus returns to whatever opens the last image shown, so a
 * gallery hands focus back where the user left off. Pass it to `createZoom(…, { renderer })`.
 * Requires `HTMLDialogElement.showModal()`; opening throws without it, and no polyfill is installed.
 * Import `medium-zoom/renderers/style.css` for its backdrop and closing styles.
 */
export function dialog({
  label,
  content,
  transition,
}: DialogOptions = {}): ZoomRenderer {
  const stage: Stage = {
    mount({ zoom, close, trigger = document.activeElement as HTMLElement }) {
      const element = document.createElement('dialog')
      if (typeof element.showModal !== 'function') {
        throw new Error(
          'Medium Zoom dialog renderer requires HTMLDialogElement.showModal()'
        )
      }
      element.className = 'medium-zoom-dialog'
      // Viewport coordinates keep the top-layer host independent of document scroll.
      element.style.cssText =
        'position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;color:inherit;overflow:visible;'
      let disposed = false
      // The page still scrolls under the modal: move the image and controls with it, as the
      // zoom does in the document, while the backdrop stays put until the scroll closes it.
      // The dialog must not clip, or shifting it would cut off the counter-shifted backdrop.
      const scrolled = scrollY
      // The engine reuses its backdrop for later openings: reset what is set on it here.
      let overlay: HTMLElement | null
      const follow = () => {
        element.style.translate = `0 ${scrolled - scrollY}px`
        overlay!.style.translate = `0 ${scrollY - scrolled}px`
      }
      // The engine appends its backdrop after mounting the stage.
      queueMicrotask(() => {
        overlay = element.querySelector('.medium-zoom-overlay')
        if (disposed || !overlay) {
          return
        }
        addEventListener('scroll', follow, { passive: true })
        // Controls take the backdrop's color scheme, so light-dark() styles contrast with
        // what is actually behind them, however the page sets its theme. A mostly
        // see-through backdrop keeps the page's scheme.
        const color = getComputedStyle(overlay).backgroundColor
        const [red, green, blue, alpha = 1] =
          (color.startsWith('rgb') && color.match(/[\d.]+/g)!.map(Number)) || []
        if (alpha >= 0.5) {
          element.style.colorScheme =
            red! * 0.3 + green! * 0.6 + blue! * 0.1 < 128 ? 'dark' : 'light'
        }
      })
      element.addEventListener('submit', event => {
        const form = event.target as HTMLFormElement
        const submitter = (event as SubmitEvent)
          .submitter as HTMLButtonElement | null
        if (
          !event.defaultPrevented &&
          (submitter?.formMethod || form.method) === 'dialog'
        ) {
          event.preventDefault()
          close()
        }
      })
      element.addEventListener('close', () => {
        if (!disposed) {
          close()
        }
      })
      element.addEventListener('cancel', event => {
        event.preventDefault()
        close()
      })
      document.body.appendChild(element)
      let cleanup: void | (() => void) = undefined
      try {
        cleanup = content?.({ element, zoom: zoom as ModalZoom, close })
        element.showModal()
      } catch (error) {
        disposed = true
        try {
          cleanup?.()
        } finally {
          element.remove()
        }
        throw error
      }
      let outgoing: Frame[] = []
      let replaced: HTMLElement | SVGElement | undefined
      let opener = trigger
      let stepped = false
      // The engine dismisses on the frames it holds; the frames kept here are the stage's.
      element.addEventListener('click', event => {
        if (outgoing.indexOf(event.target as Frame) !== -1) {
          close()
        }
      })
      const describe = (next: Frame, previous?: Frame) => {
        if (previous) {
          previous.setAttribute('aria-hidden', 'true')
        }
        for (const name of [
          'aria-hidden',
          'role',
          'tabindex',
          'aria-haspopup',
        ]) {
          next.removeAttribute(name)
        }
        element.setAttribute(
          'aria-label',
          label?.trim() ||
            frameLabel(next) ||
            (previous && frameLabel(previous)) ||
            'Zoomed image'
        )
      }
      return {
        element,
        take(frames, source, stepping) {
          replaced = source
          stepped = stepping
          // Leave from where the frames are on screen, even mid-zoom. Stepping swaps them out
          // in this same task, so freezing would be wasted layout work.
          if (!stepping) {
            freeze(frames)
          }
          frames.forEach(frame =>
            frame.classList.add('medium-zoom-image--leaving')
          )
          outgoing = frames.concat(outgoing).filter(frame => frame.isConnected)
        },
        enter(frame) {
          if (replaced) {
            frame.style.visibility = 'hidden'
            opener =
              (zoom
                .getZoomedImage()
                ?.closest('a[href],button,[tabindex]') as HTMLElement) ||
              trigger
          }
          describe(frame)
          element.setAttribute('aria-busy', 'true')
        },
        present(frames, transform, done) {
          if (frames.length > 1) {
            describe(frames[frames.length - 1]!, frames[0])
          }
          element.removeAttribute('aria-busy')
          const source = replaced
          if (!source) {
            return
          }
          replaced = undefined
          commitFrames(frames, transform)
          outgoing.forEach(frame => frame.setAttribute('aria-hidden', 'true'))
          let cancelled = false
          let cancel: (() => void) | undefined
          const complete = (error?: unknown) => {
            if (cancelled) {
              return
            }
            outgoing.forEach(frame => frame.remove())
            outgoing = []
            done(error)
          }
          // Frames replaced before they were fitted, or swiped off screen, are never seen
          // leaving: keep them out of the effect.
          const staged = (elements: readonly Frame[]) =>
            elements
              .filter(element => {
                const box = element.getBoundingClientRect()
                return (
                  element.style.transform &&
                  box.right > 0 &&
                  box.left < innerWidth
                )
              })
              .map(element => ({
                element,
                transform: element.style.transform,
              }))
          const leaving = staged(outgoing)
          // With nothing visibly leaving, the effect would fade in from an empty backdrop:
          // show the next image at once instead.
          if (transform && transition && !stepped && leaving.length) {
            const images = zoom.getImages()
            cancel = transition(
              {
                outgoing: leaving,
                incoming: staged(frames),
                direction:
                  images.indexOf(zoom.getZoomedImage()!) >
                  images.indexOf(source as HTMLElement)
                    ? 1
                    : -1,
              },
              complete
            )
          } else {
            // A frame still decoding paints nothing: keep the outgoing frames beneath it until
            // it can, or the backdrop flashes through.
            const finish = () => complete()
            void Promise.resolve(
              (frames[0] as HTMLImageElement).decode?.()
            ).then(finish, finish)
          }
          return () => {
            cancelled = true
            // Freeze before the effect clears its animations, or frames jump to their end state.
            freeze(frames.concat(outgoing))
            cancel?.()
          }
        },
        dispose() {
          disposed = true
          removeEventListener('scroll', follow)
          overlay?.style.removeProperty('translate')
          try {
            cleanup?.()
          } finally {
            element.close()
            element.remove()
            if (opener?.isConnected) {
              opener.focus({ preventScroll: true })
              opener.scrollIntoView({ block: 'nearest' })
            }
          }
        },
      }
    },
  }
  return stage as unknown as ZoomRenderer
}

/**
 * Applies styles without running CSS transitions, forcing a single layout for all frames.
 * Inline transitions are dropped rather than restored: the stylesheet's !important one wins.
 */
const withoutTransitions = (
  frames: readonly Frame[],
  apply: (frame: Frame, index: number) => void
): void => {
  frames.forEach((frame, index) => {
    frame.style.setProperty('transition', 'none', 'important')
    apply(frame, index)
  })
  frames[0]?.getBoundingClientRect()
  frames.forEach(({ style }) => style.removeProperty('transition'))
}

/** Without transitions, a new scene's frames would replay the zoom from their thumbnail. */
const commitFrames = (frames: readonly Frame[], transform: string | null) =>
  withoutTransitions(frames, frame => {
    // A frame that could not be fitted still shows, in its own box.
    if (transform) {
      frame.style.transform = transform
    }
    frame.style.visibility = ''
  })

/** Holds frames where they are on screen, reading every style before writing any: one layout. */
const freeze = (frames: readonly Frame[]): void => {
  const shown = frames.map(frame => {
    const { transform, opacity } = getComputedStyle(frame)
    return { transform: transform === 'none' ? '' : transform, opacity }
  })
  withoutTransitions(frames, (frame, index) => {
    Object.assign(frame.style, shown[index])
  })
}
