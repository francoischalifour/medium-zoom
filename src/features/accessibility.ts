import type { ZoomFeature } from 'medium-zoom/core'

import type { FeatureHooks } from '../engine/types'

const interactive =
  'button,a[href],input,select,textarea,summary,label,[role="button"],[role="link"],[role="checkbox"],[role="radio"],[role="switch"],[role="menuitem"],[contenteditable]'

/** Keyboard triggers for bare images; authored interactive wrappers keep their own semantics. */
export function accessibility(): ZoomFeature<{}> {
  const labels = new WeakMap<Element, string | null>()
  const feature: FeatureHooks = {
    __mz_requiresModal: true,
    __mz_setup(zoom) {
      const records = new Map<HTMLElement, () => void>()
      // Engine instance methods close over state and never use `this`.
      // oxlint-disable typescript/unbound-method
      const attach = zoom.attach
      const detach = zoom.detach
      // oxlint-enable typescript/unbound-method
      const sync = () => {
        for (const [image, cleanup] of records) {
          if (!zoom.getImages().includes(image)) {
            cleanup()
            records.delete(image)
          }
        }
        for (const image of zoom.getImages()) {
          if (
            records.has(image) ||
            image.parentElement?.closest(interactive) ||
            image.isContentEditable ||
            (image.matches(interactive) && image.getAttribute('role') !== 'button')
          ) {
            continue
          }
          labels.set(image, image.getAttribute('aria-label'))
          const attributes = {
            role: 'button',
            tabindex: image.getAttribute('tabindex') || '0',
            'aria-label':
              image.getAttribute('aria-label') ||
              `Zoom image${image.getAttribute('alt') ? `: ${image.getAttribute('alt')}` : ''}`,
            'aria-haspopup': 'dialog',
          }
          const previous = Object.keys(attributes).map(name => [name, image.getAttribute(name)])
          for (const [name, value] of Object.entries(attributes)) {
            image.setAttribute(name, value)
          }
          const keydown = (event: KeyboardEvent) => {
            if (!event.defaultPrevented && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault()
              if (!event.repeat) {
                void zoom.open({ target: image, trigger: image })
              }
            }
          }
          image.addEventListener('keydown', keydown)
          records.set(image, () => {
            image.removeEventListener('keydown', keydown)
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
      zoom.attach = (...selectors) => {
        attach(...selectors)
        sync()
        return zoom
      }
      zoom.detach = (...selectors) => {
        detach(...selectors)
        sync()
        return zoom
      }
      sync()
    },
    __mz_mount({ frame, original }) {
      const image = frame.content
      // A clone is content, never a second activation control.
      const label = labels.get(original)
      if (label === null) {
        image.removeAttribute('aria-label')
      } else if (label !== undefined) {
        image.setAttribute('aria-label', label)
      }
      for (const name of ['role', 'tabindex', 'aria-haspopup']) {
        image.removeAttribute(name)
      }
    },
  }
  return feature as unknown as ZoomFeature<{}>
}
