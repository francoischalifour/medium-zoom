import type { ZoomFeature } from 'medium-zoom/core'
import type { FeatureHooks } from '../engine/types'

export function hdImage(): ZoomFeature<{}> {
  const feature: FeatureHooks = {
    load(session, ready, close) {
      const original = session.__mz_original!
      const zoomed = session.__mz_zoomed!
      const source = original.getAttribute('data-zoom-src')
      if (!source && !original.hasAttribute('srcset')) return
      // Install handlers before assigning sources: Firefox may queue a cached load.
      const hd = document.createElement('img')
      ;(Array.prototype.slice.call(zoomed.attributes) as Attr[]).forEach(({ name, value }) => {
        if (!/^(src|srcset|sizes|loading)$/.test(name)) hd.setAttribute(name, value)
      })
      const cleanup = () => {
        hd.removeEventListener('load', finish)
        hd.removeEventListener('error', finish)
      }
      const finish = () => {
        cleanup()
        if (session.__mz_closing) return
        if (hd.naturalWidth) {
          hd.classList.add('medium-zoom-image--opened')
          hd.addEventListener('click', close)
          document.body.appendChild(hd)
          session.__mz_nodes!.push(hd)
        } else {
          console.warn(`Unable to reach the zoom image target ${hd.currentSrc || hd.src}`)
        }
        ready(hd.naturalWidth ? hd : undefined)
      }
      hd.addEventListener('load', finish)
      hd.addEventListener('error', finish)
      if (!source) hd.srcset = zoomed.srcset
      hd.src = source || zoomed.src
      return cleanup
    },
  }
  return feature as unknown as ZoomFeature<{}>
}
