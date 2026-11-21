import type {
  CoreZoomOptions,
  ModalZoom,
  ZoomCommander,
} from 'medium-zoom/core'

import type { ZoomTarget } from './frame'

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
  const records = new Map<ZoomTarget, () => void>()
  const documents = new WeakMap<Document, number>()
  const activate = (target: HTMLElement) =>
    commander.open({ target, trigger: target })
  const unmodified = (event: MouseEvent | KeyboardEvent) =>
    !event.defaultPrevented &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  const click = (event: MouseEvent) => {
    const image = event.target as ZoomTarget
    if (records.has(image) && unmodified(event) && event.button === 0) {
      event.preventDefault()
      void activate(image as HTMLElement)
    }
  }
  const keydown = (event: KeyboardEvent) => {
    if (unmodified(event) && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      if (!event.repeat) {
        void activate(event.currentTarget as HTMLElement)
      }
    }
  }
  const sync = () => {
    for (const image of zoom.getImages() as ZoomTarget[]) {
      if (
        records.has(image) ||
        image.closest(interactive) ||
        (image as HTMLElement).isContentEditable
      ) {
        continue
      }
      const attributes = {
        role: 'button',
        tabindex: image.getAttribute('tabindex') || '0',
        'aria-haspopup': 'dialog',
      }
      const previous = Object.entries(attributes).map(([name, value]) => {
        const original = image.getAttribute(name)
        image.setAttribute(name, value)
        return [name, value, original] as const
      })
      const hadClass = image.classList.contains('medium-zoom-image')
      image.classList.add('medium-zoom-image')
      const owner = image.ownerDocument
      const count = documents.get(owner) || 0
      if (!count) {
        owner.addEventListener('click', click)
      }
      documents.set(owner, count + 1)
      image.addEventListener('keydown', keydown as EventListener)
      records.set(image, () => {
        image.removeEventListener('keydown', keydown as EventListener)
        const remaining = documents.get(owner)! - 1
        documents.set(owner, remaining)
        if (!remaining) {
          owner.removeEventListener('click', click)
        }
        if (!hadClass) {
          image.classList.remove('medium-zoom-image')
        }
        for (const [name, value, original] of previous) {
          if (image.getAttribute(name) !== value) {
            continue
          }
          if (original === null) {
            image.removeAttribute(name)
          } else {
            image.setAttribute(name, original)
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
    if (bindings.get(zoom) !== unbind) {
      return
    }
    bindings.delete(zoom)
    zoom.off('attach', sync).off('detach', detach)
    records.forEach(cleanup => cleanup())
    records.clear()
  }
  bindings.set(zoom, unbind)
  return unbind
}
