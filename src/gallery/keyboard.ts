import type { GalleryController } from '../gallery'
import type { CoreZoomOptions } from '../types'

/** Opt-in arrow-key binding for application-owned galleries. Creates no UI. */
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
