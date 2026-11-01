import type { CoreZoomOptions, Zoom } from './core'
import type { GallerySource } from './engine/types'
import type { ZoomTarget } from './targets/types'

const bindings = new WeakMap<object, () => void>()
const interactive =
  'button,a[href],input,select,textarea,summary,label,[role="button"],[role="link"],[role="checkbox"],[role="radio"],[role="switch"],[role="menuitem"],[contenteditable]'

/** Opt-in activation for bare images. Native/framework buttons keep their own activation. */
export function bindZoomTriggers<Options extends CoreZoomOptions>(zoom: Zoom<Options>): () => void {
  const existing = bindings.get(zoom)
  if (existing) {
    return existing
  }
  if (!(zoom as unknown as GallerySource).__mz_select) {
    throw new Error('Medium Zoom trigger bindings require a modal renderer')
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
        'aria-label':
          image.getAttribute('aria-label') ||
          `Zoom image${image.getAttribute('alt') ? `: ${image.getAttribute('alt')}` : ''}`,
        'aria-haspopup': 'dialog',
      }
      const previous = Object.keys(attributes).map(name => [name, image.getAttribute(name)])
      image.__mz_triggerLabel = image.getAttribute('aria-label')
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
            void zoom.open({ target: image as HTMLElement, trigger: image as HTMLElement })
          }
        }
      }
      image.addEventListener('keydown', keydown as EventListener)
      records.set(image, () => {
        image.removeEventListener('keydown', keydown as EventListener)
        delete image.__mz_triggerLabel
        for (const [name, value] of previous) {
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
