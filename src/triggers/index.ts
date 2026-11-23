import type { CoreZoomOptions, ModalZoom } from 'medium-zoom/core'

/** Options of `bindZoomTriggers()`. */
export interface ZoomTriggersOptions {
  /** Unbinds when aborted, as the returned function does. */
  signal?: AbortSignal
}

const bindings = new WeakMap<object, { unbind: () => void; count: number }>()
const interactive =
  'button,a[href],input,select,textarea,summary,label,[role="button"],[role="link"],[role="checkbox"],[role="radio"],[role="switch"],[role="menuitem"],[contenteditable]'

/**
 * Opens the zoom on click, Enter or Space on each attached image, current and future, and
 * announces it with `role="button"` and `aria-haspopup="dialog"`. Skips images inside
 * interactive elements, whose own activation is kept. A zoom has one binding: each call
 * returns an unbind function of its own, and the images' attributes are restored once every
 * caller has unbound.
 */
export function bindZoomTriggers<Options extends CoreZoomOptions>(
  zoom: ModalZoom<Options>,
  { signal }: ZoomTriggersOptions = {}
): () => void {
  if (signal?.aborted) {
    return () => {}
  }
  const binding = bindings.get(zoom) || {
    unbind: bind(zoom),
    count: 0,
  }
  bindings.set(zoom, binding)
  binding.count++
  let bound = true
  const unbind = () => {
    if (bound) {
      bound = false
      signal?.removeEventListener('abort', unbind)
      if (!--binding.count) {
        bindings.delete(zoom)
        binding.unbind()
      }
    }
  }
  signal?.addEventListener('abort', unbind)
  return unbind
}

function bind<Options extends CoreZoomOptions>(
  zoom: ModalZoom<Options>
): () => void {
  let attached: readonly HTMLElement[] | undefined
  const records = new Map<HTMLElement, () => void>()
  const documents = new WeakMap<Document, number>()
  const activate = (target: HTMLElement) =>
    zoom.open({ target, trigger: target })
  const unmodified = (event: MouseEvent | KeyboardEvent) =>
    !event.defaultPrevented &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  const click = (event: MouseEvent) => {
    const image = event.target as HTMLElement
    if (records.has(image) && unmodified(event) && event.button === 0) {
      event.preventDefault()
      void activate(image)
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
  const bindImage = (image: HTMLElement) => {
    if (
      records.has(image) ||
      image.closest(interactive) ||
      image.isContentEditable
    ) {
      return
    }
    const attributes = {
      role: 'button',
      tabindex: image.getAttribute('tabindex') || '0',
      'aria-haspopup': 'dialog',
    }
    const restore = Object.entries(attributes).map(([name, value]) => {
      const original = image.getAttribute(name)
      image.setAttribute(name, value)
      return () => {
        if (image.getAttribute(name) === value) {
          if (original === null) {
            image.removeAttribute(name)
          } else {
            image.setAttribute(name, original)
          }
        }
      }
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
      restore.forEach(attribute => attribute())
    })
  }
  const sync = () => {
    const current = zoom.getSnapshot().images
    if (current === attached) {
      return
    }
    attached = current
    const images = new Set(current)
    records.forEach((cleanup, image) => {
      if (!images.has(image)) {
        cleanup()
        records.delete(image)
      }
    })
    images.forEach(bindImage)
  }
  const unsubscribe = zoom.subscribe(sync)
  sync()
  return () => {
    unsubscribe()
    records.forEach(cleanup => cleanup())
    records.clear()
  }
}
