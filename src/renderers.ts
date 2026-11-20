import type { ModalZoom, ZoomRenderer, ZoomContent } from 'medium-zoom/core'

import type { Stage } from './engine/create-zoom'
import type { Frame } from './engine/frame'

/** A frame on stage with the transform that fits it. */
export interface StagedFrame {
  readonly element: HTMLElement
  readonly transform: string
}
/** One scene replacing another inside the dialog. */
export interface SceneChange {
  readonly outgoing: readonly StagedFrame[]
  readonly incoming: readonly StagedFrame[]
  readonly direction: -1 | 1
}
/**
 * Presents a scene change and calls `done` when it settles; returns its cancellation.
 * Build one from an application effect with `galleryTransition` from
 * `medium-zoom/transitions`.
 */
export type SceneTransition = (change: SceneChange, done: (error?: unknown) => void) => () => void

const frameLabel = (frame: Frame) =>
  frame.alt.trim() || frame.getAttribute('aria-label')?.trim() || ''

export interface DialogOptions {
  /** Accessible dialog name. Defaults to the image alt text, then "Zoomed image". */
  label?: string
  /** How one image replaces another while the dialog stays open. Default: instant. */
  transition?: SceneTransition
  /** Mount application-owned content inside the modal; return its cleanup. */
  content?: ZoomContent
}

/** A native modal host. Requires HTMLDialogElement.showModal; no polyfill is installed. */
export function dialog({ label, content, transition }: DialogOptions = {}): ZoomRenderer {
  const stage: Stage = {
    mount({ frame, zoom, close, trigger = document.activeElement as HTMLElement }) {
      const element = document.createElement('dialog')
      if (typeof element.showModal !== 'function') {
        throw new Error('Medium Zoom dialog renderer requires HTMLDialogElement.showModal()')
      }
      element.className = 'medium-zoom-dialog'
      element.setAttribute('aria-label', label?.trim() || frameLabel(frame) || 'Zoomed image')
      // Viewport coordinates keep the top-layer host independent of document scroll.
      element.style.cssText =
        'position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;color:inherit;overflow:hidden;'
      const style = document.createElement('style')
      style.textContent =
        '.medium-zoom-dialog::backdrop{background:transparent}.medium-zoom-dialog>.medium-zoom-overlay{z-index:-1}'
      let disposed = false
      element.addEventListener('submit', event => {
        const form = event.target as HTMLFormElement
        const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null
        if (!event.defaultPrevented && (submitter?.formMethod || form.method) === 'dialog') {
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
      // The existing overlay owns fading and click dismissal inside the modal.
      element.appendChild(style)
      document.body.appendChild(element)
      let cleanup: void | (() => void) = undefined
      try {
        // A stage only ever mounts for a zoom created with this renderer.
        cleanup = content?.({ element, zoom: zoom as ModalZoom, close })
        element.showModal()
      } catch (error) {
        try {
          cleanup?.()
        } finally {
          element.remove()
        }
        throw error
      }
      const transforms = new WeakMap<Frame, string>()
      // Frames of replaced scenes stay on stage until the next scene is presented.
      let outgoing: Frame[] = []
      let replaced: HTMLElement | SVGElement | undefined
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
        for (const name of ['aria-hidden', 'role', 'tabindex', 'aria-haspopup']) {
          next.removeAttribute(name)
        }
        element.setAttribute(
          'aria-label',
          label?.trim() || frameLabel(next) || (previous && frameLabel(previous)) || 'Zoomed image'
        )
      }
      return {
        element,
        take(frames, source) {
          replaced = source
          outgoing = frames.concat(outgoing).filter(frame => frame.isConnected)
        },
        enter(frame) {
          if (replaced) {
            frame.style.visibility = 'hidden'
          }
          describe(frame)
          element.setAttribute('aria-busy', 'true')
        },
        present(frames, transform, done) {
          if (frames.length > 1) {
            describe(frames[frames.length - 1]!, frames[0])
          }
          element.removeAttribute('aria-busy')
          if (transform) {
            frames.forEach(frame => transforms.set(frame, transform))
          }
          const source = replaced
          if (!source) {
            return
          }
          replaced = undefined
          frames.forEach(frame => commitFrame(frame, transform))
          outgoing.forEach(frame => {
            frame.setAttribute('aria-hidden', 'true')
            commitFrame(frame, transforms.get(frame))
          })
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
          if (transform && transition) {
            const images = zoom.getImages()
            const staged = (elements: readonly Frame[]) =>
              elements
                .filter(element => transforms.has(element))
                .map(element => ({ element, transform: transforms.get(element)! }))
            cancel = transition(
              {
                outgoing: staged(outgoing),
                incoming: staged(frames),
                direction:
                  images.indexOf(zoom.getZoomedImage()) > images.indexOf(source as HTMLElement)
                    ? 1
                    : -1,
              },
              complete
            )
          } else {
            complete()
          }
          return () => {
            cancelled = true
            cancel?.()
          }
        },
        dispose() {
          disposed = true
          try {
            cleanup?.()
          } finally {
            element.close()
            element.remove()
            if (trigger?.isConnected) {
              trigger.focus({ preventScroll: true })
            }
          }
        },
      }
    },
  }
  return stage as unknown as ZoomRenderer
}

/** Scene replacement commits fitted geometry without replaying the thumbnail motion. */
const commitFrame = (frame: Frame, transform: string | undefined | null): void => {
  if (!transform) {
    return
  }
  const style = frame.style
  const transition = style.getPropertyValue('transition')
  const priority = style.getPropertyPriority('transition')
  style.setProperty('transition', 'none', 'important')
  style.transform = transform
  style.visibility = ''
  frame.getBoundingClientRect()
  if (transition) {
    style.setProperty('transition', transition, priority)
  } else {
    style.removeProperty('transition')
  }
}
