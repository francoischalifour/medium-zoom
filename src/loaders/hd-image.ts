import type { ZoomLoader } from 'medium-zoom/core'

/**
 * Loads the image's `data-zoom-src`, or its `srcset`, in high resolution and shows it over the
 * frame once loaded. Keeps the attached image when neither is set or loading fails.
 */
export const loadHdImage: ZoomLoader = ({ original, clone }, ready) => {
  const source = original.getAttribute('data-zoom-src')
  if (!source && !original.hasAttribute('srcset')) {
    ready()
    return
  }
  // Install handlers before assigning sources: Firefox may queue a cached load.
  const hd = document.createElement('img')
  // Request attributes must be present before src: CORS/referrer policy cannot be adopted later.
  Array.prototype.forEach.call(clone.attributes, ({ name, value }: Attr) => {
    if (!/^(src|srcset|sizes|loading)$/.test(name)) {
      hd.setAttribute(name, value)
    }
  })
  const cleanup = () => {
    hd.removeEventListener('load', finish)
    hd.removeEventListener('error', finish)
  }
  const finish = () => {
    cleanup()
    if (!hd.naturalWidth) {
      console.warn(`Cannot load ${hd.currentSrc || hd.src}`)
    }
    ready(hd.naturalWidth ? hd : undefined)
  }
  hd.addEventListener('load', finish)
  hd.addEventListener('error', finish)
  if (!source) {
    hd.srcset = clone.srcset
  }
  hd.src = source || clone.src
  return cleanup
}
