import type { ZoomContent } from 'medium-zoom/core'

import { bindGalleryGestures } from './gestures'
import { createGallery } from './index'
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
 * Previous and next buttons, a position and a quieter close button for `dialog({ content })`,
 * with keyboard navigation and gestures (`bindGalleryKeyboard()`, `bindGalleryGestures()`):
 * swipe, pinch, pan, double tap and drag to close. A tap on the image or the backdrop still
 * closes the zoom.
 * Import `medium-zoom/gallery.css`, which includes the core and dialog styles, or
 * `medium-zoom/gallery/style.css` next to them. Theme it with `--medium-zoom-control-color`
 * and `--medium-zoom-control-background` or restyle the `.medium-zoom-control` and
 * `.medium-zoom-navigation` classes: its rules are layered, so yours win. For your own UI,
 * build on `createGallery()` instead.
 */
export function galleryControls({
  closeLabel = 'Close',
  previousLabel = 'Previous image',
  nextLabel = 'Next image',
  positionLabel = (position, total) => `Image ${position} of ${total}`,
}: GalleryControlsOptions = {}): ZoomContent {
  return ({ element, zoom, close }) => {
    const gallery = createGallery(zoom)
    const control = (
      name: keyof typeof icons,
      label: string,
      activate: () => unknown
    ) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = `medium-zoom-control medium-zoom-control--${name}`
      button.ariaLabel = label
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name]}"/></svg>`
      button.onclick = activate
      return button
    }
    const closeButton = control('close', closeLabel, close)
    const previous = control('previous', previousLabel, gallery.previous)
    const next = control('next', nextLabel, gallery.next)
    const position = document.createElement('p')
    position.className = 'medium-zoom-position'
    position.role = 'status'
    const shown = document.createElement('span')
    shown.ariaHidden = 'true'
    const current = document.createElement('span')
    const count = document.createTextNode('')
    shown.append(current, count)
    const announced = document.createElement('span')
    position.append(shown, announced)
    // Navigation gathers below the image, which keeps the attention.
    const navigation = document.createElement('div')
    navigation.className = 'medium-zoom-navigation'
    navigation.append(previous, position, next)
    let announcing: ReturnType<typeof setTimeout> | undefined
    const update = () => {
      const { index, images, canPrevious, canNext } = gallery.getSnapshot()
      const total = images.length
      // aria-disabled, unlike disabled, keeps focus on a button that reaches either end.
      previous.ariaDisabled = String(!canPrevious)
      next.ariaDisabled = String(!canNext)
      navigation.hidden = total < 2
      current.textContent = String(index + 1)
      count.data = ` / ${total}`
      // Announce where stepping settles instead of every image passed on the way.
      clearTimeout(announcing)
      announcing = setTimeout(() => {
        announced.textContent = positionLabel(index + 1, total)
      }, 300)
    }
    // The image gets the stage to itself until the pointer moves or a control takes focus.
    const idleAttribute = 'data-medium-zoom-idle'
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
    const unsubscribe = gallery.subscribe(update)
    bindGalleryKeyboard(element, gallery)
    const unbindGestures = bindGalleryGestures({ element, zoom, close })
    // An arrow key presses its button while held, so the keys and the controls read as one.
    // Registered after the keyboard binding: a handled key arrives already prevented. A
    // zoomed image pans with the arrows instead.
    const press = (event: KeyboardEvent) => {
      const button = { ArrowLeft: previous, ArrowRight: next }[event.key]
      button?.toggleAttribute(
        'data-pressed',
        event.type === 'keydown' &&
          event.defaultPrevented &&
          !element.hasAttribute('data-medium-zoom-zoomed')
      )
    }
    element.addEventListener('keydown', press)
    element.addEventListener('keyup', press)
    update()
    element.append(closeButton, navigation)
    element.tabIndex = -1
    // Runs once the dialog is open and laid out, before it is painted.
    queueMicrotask(() => {
      // Controls sit centred in the margin when it fits them, otherwise inside the image's
      // edge, measured so --medium-zoom-control-size and app styles are taken into account.
      const margin = zoom.getOptions().margin || 0
      const size = closeButton.offsetWidth
      element.style.setProperty(
        '--medium-zoom-control-auto-inset',
        `${margin >= size + 16 ? (margin - size) / 2 : margin + 12}px`
      )
      // The dialog holds focus itself, so nothing shows as focused until Tab; a focused
      // button would otherwise light up on open in browsers that treat it as visible.
      element.focus({ preventScroll: true })
    })
    // The dialog, its listeners and these controls are discarded on close: release only what
    // outlives it.
    return () => {
      clearTimeout(announcing)
      clearTimeout(idle)
      unsubscribe()
      unbindGestures()
    }
  }
}
