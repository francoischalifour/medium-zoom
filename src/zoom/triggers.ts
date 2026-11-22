import type {
  CoreZoomOptions,
  ModalZoom,
  ZoomCommander,
} from 'medium-zoom/core'

import type { ZoomTarget } from './frame'

/** Options of `bindZoomTriggers()`. */
export interface ZoomTriggersOptions<Options extends CoreZoomOptions> {
  /**
   * What opens the zoom, such as a session coordinating it with other zooms.
   *
   * @default the zoom
   */
  commander?: ZoomCommander<Options>
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
 * returns an unbind function of its own, the first call's commander is kept, and the images'
 * attributes are restored once every caller has unbound.
 */
export function bindZoomTriggers<Options extends CoreZoomOptions>(
  zoom: ModalZoom<Options>,
  { commander = zoom, signal }: ZoomTriggersOptions<Options> = {}
): () => void {
  const binding = bindings.get(zoom) || {
    unbind: bind(zoom, commander),
    count: 0,
  }
  bindings.set(zoom, binding)
  binding.count++
  let bound = true
  const unbind = () => {
    if (bound) {
      bound = false
      if (!--binding.count) {
        bindings.delete(zoom)
        binding.unbind()
      }
    }
  }
  signal?.addEventListener('abort', unbind)
  if (signal?.aborted) {
    unbind()
  }
  return unbind
}

function bind<Options extends CoreZoomOptions>(
  zoom: ModalZoom<Options>,
  commander: ZoomCommander<Options>
): () => void {
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
  return () => {
    zoom.off('attach', sync).off('detach', detach)
    records.forEach(cleanup => cleanup())
    records.clear()
  }
}
