import type { ZoomFeature } from 'medium-zoom/core'

import type { FeatureHooks, Scene } from '../engine/types'

export interface GalleryOptions {
  previousLabel?: string
  nextLabel?: string
  /** Localize the live position announcement. */
  positionLabel?: (position: number, total: number) => string
}

/** Navigate the instance's attached images inside one persistent modal host. */
export function gallery({
  previousLabel = 'Previous image',
  nextLabel = 'Next image',
  positionLabel = (position, total) => `${position} of ${total}`,
}: GalleryOptions = {}): ZoomFeature<{}> {
  const hosts = new WeakMap<HTMLElement, { update: (session: Scene) => void }>()
  const feature: FeatureHooks = {
    __mz_mount(session) {
      if (!session.__mz_navigate) {
        throw new Error('Medium Zoom gallery requires a modal renderer')
      }
      const host = session.__mz_host!
      host.setAttribute('aria-busy', 'true')
      let controls = hosts.get(host)
      if (!controls) {
        let current = session
        const bar = document.createElement('div')
        bar.className = 'medium-zoom-gallery'
        bar.style.cssText =
          'position:absolute;bottom:16px;left:50%;width:max-content;max-width:calc(100% - 32px);box-sizing:border-box;transform:translateX(-50%);z-index:2147483647;display:flex;align-items:center;gap:12px;padding:8px;border-radius:8px;background:white;color:black;font:16px system-ui;'
        const previous = document.createElement('button')
        const next = document.createElement('button')
        const status = document.createElement('span')
        status.style.whiteSpace = 'nowrap'
        status.setAttribute('role', 'status')
        status.setAttribute('aria-live', 'polite')
        status.setAttribute('aria-atomic', 'true')
        for (const [button, label] of [
          [previous, previousLabel],
          [next, nextLabel],
        ] as const) {
          button.type = 'button'
          button.textContent = label
          button.style.cssText = 'min-height:44px;padding:8px 12px;font:inherit;cursor:pointer;'
        }
        const move = (direction: number) => {
          const images = current.__mz_zoom!.getImages() as HTMLImageElement[]
          const target = images[images.indexOf(current.__mz_original!) + direction]
          if (target) {
            void current.__mz_navigate!(target)
          }
        }
        previous.addEventListener('click', () => move(-1))
        next.addEventListener('click', () => move(1))
        host.addEventListener('keydown', event => {
          if (
            event.defaultPrevented ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            (event.target as HTMLElement).closest(
              'input,textarea,select,[contenteditable],video,audio'
            )
          ) {
            return
          }
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault()
            move(event.key === 'ArrowRight' ? 1 : -1)
          }
        })
        bar.append(previous, status, next)
        host.appendChild(bar)
        controls = {
          update(session) {
            current = session
            const images = session.__mz_zoom!.getImages()
            const index = images.indexOf(session.__mz_original!)
            // Keep focus on boundary controls while making their unavailable state explicit.
            previous.setAttribute('aria-disabled', String(index === 0))
            next.setAttribute('aria-disabled', String(index === images.length - 1))
            status.textContent = positionLabel(index + 1, images.length)
          },
        }
        hosts.set(host, controls)
      }
      controls.update(session)
    },
    __mz_transition(session, done) {
      session.__mz_host!.removeAttribute('aria-busy')
      if (!session.__mz_outgoing) {
        return
      }
      const incoming = session.__mz_nodes!.filter(node => node.tagName === 'IMG')
      for (const node of incoming) {
        node.style.setProperty('transition', 'none', 'important')
        node.style.visibility = ''
      }
      // Commit fitted bounds so navigation never replays the thumbnail zoom.
      incoming[0]!.getBoundingClientRect()
      incoming.forEach(node => node.style.removeProperty('transition'))
      session.__mz_outgoing.forEach(node => node.remove())
      let cancelled = false
      queueMicrotask(() => {
        if (!cancelled) {
          done()
        }
      })
      return () => {
        cancelled = true
      }
    },
  }
  return feature as unknown as ZoomFeature<{}>
}
