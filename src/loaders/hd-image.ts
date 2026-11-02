import type { ZoomLoader } from '../core'
import { isImage } from '../targets/image'

export const loadHdImage: ZoomLoader = ({ original, content: zoomed }, ready) => {
  if (!isImage(original) || !isImage(zoomed)) {
    ready()
    return
  }
  const source = original.getAttribute('data-zoom-src')
  if (!source && !original.hasAttribute('srcset')) {
    ready()
    return
  }
  // Install handlers before assigning sources: Firefox may queue a cached load.
  const hd = document.createElement('img')
  // Request attributes must be present before src: CORS/referrer policy cannot be adopted later.
  ;(Array.prototype.slice.call(zoomed.attributes) as Attr[]).forEach(({ name, value }) => {
    if (!/^(src|srcset|sizes|loading)$/.test(name)) {
      hd.setAttribute(name, value)
    }
  })
  let cancelled = false
  const cleanup = () => {
    cancelled = true
    hd.removeEventListener('load', finish)
    hd.removeEventListener('error', finish)
  }
  const finish = () => {
    if (cancelled) {
      return
    }
    cleanup()
    if (!hd.naturalWidth) {
      console.warn(`Unable to reach the zoom image target ${hd.currentSrc || hd.src}`)
    }
    ready(hd.naturalWidth ? hd : undefined)
  }
  hd.addEventListener('load', finish)
  hd.addEventListener('error', finish)
  if (!source) {
    hd.srcset = zoomed.srcset
  }
  hd.src = source || zoomed.src
  return cleanup
}
