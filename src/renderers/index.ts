import type { GalleryTransition } from '../targets/types'
import { runGalleryTransition } from './transition'
export type { GalleryTransition, GalleryTransitionContext } from '../targets/types'
import type { ZoomRenderer, Zoom } from 'medium-zoom/core'

import type { RendererHooks } from '../engine/types'

export interface DialogOptions {
  /** Accessible dialog name. Defaults to the image alt text, then "Zoomed image". */
  label?: string
  /** Visible and accessible close button text, for localization. */
  closeLabel?: string
  /** Optional user-land strategy for already-fitted gallery frames. Default: instant. */
  transition?: GalleryTransition
  /** Mount application-owned content inside the modal; return its cleanup. */
  content?: (view: {
    readonly element: HTMLDialogElement
    readonly zoom: Zoom
    close: () => void
  }) => void | (() => void)
}

/** A native modal host. Requires HTMLDialogElement.showModal; no polyfill is installed. */
export function dialog({
  label,
  closeLabel = 'Close image',
  content,
  transition,
}: DialogOptions = {}): ZoomRenderer {
  const renderer: RendererHooks = {
    mount({ frame, zoom, close, trigger = document.activeElement as HTMLElement }) {
      frame.content.removeAttribute('aria-hidden')
      const element = document.createElement('dialog')
      if (typeof element.showModal !== 'function') {
        throw new Error('Medium Zoom dialog renderer requires HTMLDialogElement.showModal()')
      }
      element.className = 'medium-zoom-dialog'
      element.setAttribute('aria-label', label?.trim() || frame.label || 'Zoomed image')
      // Viewport coordinates keep the top-layer host independent of document scroll.
      element.style.cssText =
        'position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;color:inherit;overflow:hidden;'
      const style = document.createElement('style')
      style.textContent = '.medium-zoom-dialog::backdrop{background:transparent}'
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = closeLabel.trim() || 'Close image'
      button.autofocus = true
      button.style.cssText =
        'position:absolute;top:16px;right:16px;z-index:2147483647;padding:12px 16px;border:1px solid currentColor;border-radius:4px;background:white;color:black;font:inherit;cursor:pointer;'
      let disposed = false
      button.addEventListener('click', close)
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
      element.appendChild(button)
      document.body.appendChild(element)
      let cleanup: void | (() => void) = undefined
      try {
        cleanup = content?.({ element, zoom, close })
        element.showModal()
      } catch (error) {
        cleanup?.()
        element.remove()
        throw error
      }
      return {
        element,
        update(next) {
          next.content.removeAttribute('aria-hidden')
          element.setAttribute('aria-label', label?.trim() || next.label || 'Zoomed image')
        },
        ...(transition && {
          transition: (frames, done) => runGalleryTransition(transition, frames, done),
        }),
        setLoading(loading) {
          if (loading) {
            element.setAttribute('aria-busy', 'true')
          } else {
            element.removeAttribute('aria-busy')
          }
        },
        dispose() {
          disposed = true
          cleanup?.()
          element.close()
          element.remove()
          if (trigger?.isConnected) {
            trigger.focus({ preventScroll: true })
          }
        },
      }
    },
  }
  return renderer as unknown as ZoomRenderer
}
