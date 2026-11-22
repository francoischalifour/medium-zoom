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
  // Set CORS and referrer policy before assigning a source so they apply to the request.
  Array.prototype.forEach.call(clone.attributes, ({ name, value }: Attr) => {
    if (!/^(src|srcset|sizes|loading)$/.test(name)) {
      hd.setAttribute(name, value)
    }
  })
  let done = false
  const cleanup = () => {
    hd.removeEventListener('load', finish)
    hd.removeEventListener('error', finish)
    // Clearing the source aborts a download the zoom no longer needs.
    if (!done) {
      hd.removeAttribute('srcset')
      hd.removeAttribute('src')
    }
  }
  const finish = () => {
    done = true
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
