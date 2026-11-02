import type { Zoom } from '../types'

/** Historical automatic pointer activation. Modern instances opt into their own binding. */
export function bindLegacyTriggers(zoom: Zoom): void {
  let attached: Element[] = []
  const click = (event: Event) => {
    const target = event.target as HTMLElement
    if (zoom.getImages().indexOf(target) !== -1) {
      void zoom.toggle({ target })
    }
  }
  const attach = (image: Element) => {
    if (attached.indexOf(image) !== -1) {
      return
    }
    image.classList.add('medium-zoom-image')
    attached.push(image)
    if (attached.length === 1) {
      document.addEventListener('click', click)
    }
  }
  zoom.on('attach', event => attach(event.target as Element))
  zoom.on('detach', event => {
    ;(event.target as Element).classList.remove('medium-zoom-image')
    attached = attached.filter(image => image !== event.target)
    if (!attached.length) {
      document.removeEventListener('click', click)
    }
  })
  zoom.getImages().forEach(attach)
}
