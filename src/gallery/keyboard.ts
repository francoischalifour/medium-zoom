import type { CoreZoomOptions } from 'medium-zoom/core'

import type { GalleryController } from './index'

/**
 * The pause between steps of a held key: about 200 ms, easing towards 60 ms, so a short
 * hold stays readable and a long one travels fast.
 */
const stepInterval = (held: number) => 60 + 140 * Math.exp(-held / 800)

/** Keys aimed at these keep their own meaning. */
export const elementsWithOwnKeys =
  'input,textarea,select,[contenteditable],video,audio,[role="slider"],[role="spinbutton"],[role="combobox"]'

/** Whether a key belongs to the gallery rather than to the page or a field. */
export const isGalleryKey = (event: KeyboardEvent): boolean =>
  !event.defaultPrevented &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !(event.target as HTMLElement).closest(elementsWithOwnKeys)

/**
 * Opens the previous or next image on ArrowLeft and ArrowRight pressed inside `element`, and
 * the first or last on Home and End. A held arrow steps at a pace that accelerates the
 * longer it is held, independent of the system's repeat rate. Ignores keys with modifiers
 * and keys aimed at form fields, media, sliders and comboboxes. Creates no UI. Returns the
 * unbind function; aborting `options.signal` unbinds too.
 */
export function bindGalleryKeyboard<Options extends CoreZoomOptions>(
  element: HTMLElement,
  gallery: GalleryController<Options>,
  { signal }: { signal?: AbortSignal } = {}
): () => void {
  let pressed = 0
  let stepped = 0
  const keydown = (event: KeyboardEvent) => {
    if (!isGalleryKey(event) || event.shiftKey) {
      return
    }
    const { key } = event
    const last = gallery.getSnapshot().images.length - 1
    const end = { Home: 0, End: last }[key]
    if (end !== undefined) {
      event.preventDefault()
      void gallery.select(end)
    } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault()
      const now = event.timeStamp
      if (!event.repeat) {
        pressed = now
      } else if (now - stepped < stepInterval(now - pressed)) {
        // Dropping repeats, rather than queueing them, stops stepping as soon as the key lifts.
        return
      }
      stepped = now
      void (key === 'ArrowRight' ? gallery.next() : gallery.previous())
    }
  }
  // An already aborted signal adds nothing.
  element.addEventListener('keydown', keydown, { signal })
  return () => element.removeEventListener('keydown', keydown)
}
