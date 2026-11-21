import type { CoreZoomOptions, ModalZoom, ZoomCommander } from 'medium-zoom/core'

import type { ZoomTarget } from './engine/frame'

const bindings = new WeakMap<object, () => void>()
const interactive =
  'button,a[href],input,select,textarea,summary,label,[role="button"],[role="link"],[role="checkbox"],[role="radio"],[role="switch"],[role="menuitem"],[contenteditable]'

/**
 * Opens the zoom on click, Enter or Space on each attached image, current and future, and
 * announces it with `role="button"` and `aria-haspopup="dialog"`. Skips images inside
 * interactive elements, whose own activation is kept. Pass a session as `commander` to
 * coordinate these requests with other zooms. Returns the unbind function, which restores
 * the images' attributes.
 */
export function bindZoomTriggers<Options extends CoreZoomOptions>(
  zoom: ModalZoom<Options>,
  commander: ZoomCommander<Options> = zoom
): () => void {
  const existing = bindings.get(zoom)
  if (existing) {
    return existing
  }
  let bound = true
  const records = new Map<ZoomTarget, () => void>()
  const sync = () => {
    for (const image of zoom.getImages() as ZoomTarget[]) {
      if (
        records.has(image) ||
        image.parentElement?.closest(interactive) ||
        (image as HTMLElement).isContentEditable ||
        image.matches(interactive)
      ) {
        continue
      }
      const attributes = {
        role: 'button',
        tabindex: image.getAttribute('tabindex') || '0',
        'aria-haspopup': 'dialog',
      }
      const previous = Object.keys(attributes).map(name => [name, image.getAttribute(name)])
      for (const [name, value] of Object.entries(attributes)) {
        image.setAttribute(name, value)
      }
      const keydown = (event: KeyboardEvent) => {
        if (
          !event.defaultPrevented &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          (event.key === 'Enter' || event.key === ' ')
        ) {
          event.preventDefault()
          if (!event.repeat) {
            void commander.open({
              target: image as HTMLElement,
              trigger: image as HTMLElement,
            })
          }
        }
      }
      const click = (event: MouseEvent) => {
        if (
          event.target === image &&
          !event.defaultPrevented &&
          !event.altKey &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          event.button === 0
        ) {
          event.preventDefault()
          void commander.open({
            target: image as HTMLElement,
            trigger: image as HTMLElement,
          })
        }
      }
      const hadClass = image.classList.contains('medium-zoom-image')
      image.classList.add('medium-zoom-image')
      image.ownerDocument.addEventListener('click', click as EventListener)
      image.addEventListener('keydown', keydown as EventListener)
      records.set(image, () => {
        image.removeEventListener('keydown', keydown as EventListener)
        image.ownerDocument.removeEventListener('click', click as EventListener)
        if (!hadClass) {
          image.classList.remove('medium-zoom-image')
        }
        for (const [name, value] of previous) {
          if (image.getAttribute(name!) !== attributes[name as keyof typeof attributes]) {
            continue
          }
          if (value === null) {
            image.removeAttribute(name!)
          } else {
            image.setAttribute(name!, value!)
          }
        }
      })
    }
  }
  const detach = (event: Event) => {
    const image = event.target as ZoomTarget
    records.get(image)?.()
    records.delete(image)
  }
  zoom.on('attach', sync).on('detach', detach)
  sync()
  const unbind = () => {
    if (!bound) {
      return
    }
    bound = false
    zoom.off('attach', sync).off('detach', detach)
    records.forEach(cleanup => cleanup())
    records.clear()
    bindings.delete(zoom)
  }
  bindings.set(zoom, unbind)
  return unbind
}
