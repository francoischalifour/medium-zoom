import type { ZoomContent } from 'medium-zoom/core'

import { createGallery } from './controller'
import { bindGalleryGestures } from './gestures'
import { bindGalleryKeyboard } from './keyboard'

/** Options of `galleryControls()`. Every label defaults to English. */
export interface GalleryControlsOptions {
  /** @default "Close" */
  closeLabel?: string
  /** @default "Previous image" */
  previousLabel?: string
  /** @default "Next image" */
  nextLabel?: string
  /**
   * The position announced to assistive technology; the screen shows `3 / 12`.
   *
   * @default (position, total) => `Image ${position} of ${total}`
   */
  positionLabel?: (position: number, total: number) => string
}

const icons = {
  close: 'M6 6l12 12M18 6L6 18',
  previous: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
}

/**
 * Content for `dialog({ content })`: previous and next buttons, a position and a close
 * button, with keyboard navigation and gestures (swipe, pinch, pan, double tap, drag to
 * close). A tap on the image or the backdrop still closes the zoom.
 * Import `medium-zoom/gallery.css`, which includes the core and dialog styles, or
 * `medium-zoom/gallery/style.css` next to them. Theme it with the `--medium-zoom-control-*`
 * properties or restyle the parts: the rules are layered, so yours win. Each part has a
 * `data-slot` (`medium-zoom-close`, `-navigation`, `-previous`, `-position`, `-next`);
 * the previous and next buttons have `data-disabled` at either end and `data-pressed` while
 * an arrow key steps, and the dialog has `data-idle` while the pointer rests. For your own
 * UI, build on `createGallery()` instead.
 */
export function galleryControls({
  closeLabel = 'Close',
  previousLabel = 'Previous image',
  nextLabel = 'Next image',
  positionLabel = (position, total) => `Image ${position} of ${total}`,
}: GalleryControlsOptions = {}): ZoomContent {
  return ({ element, zoom, close, signal }) => {
    // Every handle and binding here is released with the content, through its signal.
    const gallery = createGallery(zoom, { signal })
    const control = (
      name: keyof typeof icons,
      label: string,
      activate: () => unknown
    ) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `medium-zoom-control medium-zoom-control--${name}`
      button.dataset.slot = `medium-zoom-${name}`
      button.ariaLabel = label
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name]}"/></svg>`
      button.onclick = activate
      return button
    }
    const closeButton = control('close', closeLabel, close)
    const previous = control('previous', previousLabel, () =>
      gallery.previous({ reason: 'previous-press' })
    )
    const next = control('next', nextLabel, () =>
      gallery.next({ reason: 'next-press' })
    )
    const position = document.createElement('p')
    position.className = 'medium-zoom-position'
    position.dataset.slot = 'medium-zoom-position'
    position.role = 'status'
    const shown = document.createElement('span')
    shown.ariaHidden = 'true'
    const current = document.createElement('span')
    const count = document.createTextNode('')
    shown.append(current, count)
    const announced = document.createElement('span')
    position.append(shown, announced)
    const navigation = document.createElement('div')
    navigation.className = 'medium-zoom-navigation'
    navigation.dataset.slot = 'medium-zoom-navigation'
    navigation.append(previous, position, next)
    let announcing: ReturnType<typeof setTimeout> | undefined
    const update = () => {
      const { index, images, canPrevious, canNext } = gallery.getSnapshot()
      const total = images.length
      // aria-disabled, unlike disabled, keeps focus on a button that reaches an end.
      previous.ariaDisabled = String(!canPrevious)
      next.ariaDisabled = String(!canNext)
      previous.toggleAttribute('data-disabled', !canPrevious)
      next.toggleAttribute('data-disabled', !canNext)
      navigation.hidden = total < 2
      current.textContent = String(index + 1)
      count.data = ` / ${total}`
      // Announces where stepping settles, not every image passed on the way.
      clearTimeout(announcing)
      announcing = setTimeout(() => {
        announced.textContent = positionLabel(index + 1, total)
      }, 300)
    }
    const idleAttribute = 'data-idle'
    let idle: ReturnType<typeof setTimeout> | undefined
    const wake = () => {
      element.toggleAttribute(idleAttribute, false)
      clearTimeout(idle)
      idle = setTimeout(
        () => element.toggleAttribute(idleAttribute, true),
        2_000
      )
    }
    for (const type of ['pointermove', 'pointerdown', 'focusin']) {
      element.addEventListener(type, wake)
    }
    wake()
    gallery.subscribe(update)
    bindGalleryKeyboard(element, gallery, { signal })
    bindGalleryGestures({ element, zoom, signal })
    // Registered after bindGalleryKeyboard(), so defaultPrevented means it stepped. A zoomed
    // image pans with the arrows instead, so no button shows pressed.
    const press = (event: KeyboardEvent) => {
      const button = { ArrowLeft: previous, ArrowRight: next }[event.key]
      button?.toggleAttribute(
        'data-pressed',
        event.type === 'keydown' &&
          event.defaultPrevented &&
          !element.hasAttribute('data-zoomed')
      )
    }
    element.addEventListener('keydown', press)
    element.addEventListener('keyup', press)
    update()
    element.append(closeButton, navigation)
    element.tabIndex = -1
    // Runs once the dialog is open and laid out, before it is painted.
    queueMicrotask(() => {
      // Measured, so --medium-zoom-control-size and app styles count: centred in the margin
      // when the button fits, otherwise inside the image's edge.
      const margin = zoom.getOptions().margin || 0
      const size = closeButton.offsetWidth
      element.style.setProperty(
        '--medium-zoom-control-auto-inset',
        `${margin >= size + 16 ? (margin - size) / 2 : margin + 12}px`
      )
      // Focus on the dialog, not a button: some browsers would show a focused button's
      // focus ring on open.
      element.focus({ preventScroll: true })
    })
    // The dialog and its listeners are discarded on close: release only what outlives it.
    return () => {
      clearTimeout(announcing)
      clearTimeout(idle)
    }
  }
}
