import type { GalleryController } from './gallery'
import type { CoreZoomOptions } from './types'

export interface GalleryControlsOptions {
  previousLabel?: string
  nextLabel?: string
  positionLabel?: (position: number, total: number) => string
}

/** Optional DOM keyboard adapter, shared by stock and framework-owned controls. */
export function bindGalleryKeyboard<Options extends CoreZoomOptions>(
  element: HTMLElement,
  gallery: GalleryController<Options>
): () => void {
  const keydown = (event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      (event.target as HTMLElement).closest(
        'input,textarea,select,[contenteditable],video,audio,[role="slider"],[role="spinbutton"],[role="combobox"]'
      )
    ) {
      return
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      void (event.key === 'ArrowRight' ? gallery.next() : gallery.previous())
    }
  }
  element.addEventListener('keydown', keydown)
  return () => element.removeEventListener('keydown', keydown)
}

/** Optional stock controls. Presentation is supplied by controls/style.css. */
export function mountGalleryControls<Options extends CoreZoomOptions>(
  element: HTMLElement,
  gallery: GalleryController<Options>,
  {
    previousLabel = 'Previous image',
    nextLabel = 'Next image',
    positionLabel = (position, total) => `${position} of ${total}`,
  }: GalleryControlsOptions = {}
): () => void {
  const bar = document.createElement('div')
  bar.className = 'medium-zoom-gallery'
  const previous = document.createElement('button')
  const next = document.createElement('button')
  const status = document.createElement('span')
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  status.setAttribute('aria-atomic', 'true')
  for (const [button, label] of [
    [previous, previousLabel],
    [next, nextLabel],
  ] as const) {
    button.type = 'button'
    button.textContent = label
  }
  previous.addEventListener('click', () => {
    void gallery.previous()
  })
  next.addEventListener('click', () => {
    void gallery.next()
  })
  const update = () => {
    const state = gallery.getSnapshot()
    // Retain focus when a navigation button reaches the end of the collection.
    previous.setAttribute('aria-disabled', String(!state.canPrevious))
    next.setAttribute('aria-disabled', String(!state.canNext))
    status.textContent = positionLabel(state.index + 1, state.images.length)
  }
  const unsubscribe = gallery.subscribe(update)
  const unbind = bindGalleryKeyboard(element, gallery)
  update()
  bar.append(previous, status, next)
  element.appendChild(bar)
  return () => {
    unsubscribe()
    unbind()
    bar.remove()
  }
}
