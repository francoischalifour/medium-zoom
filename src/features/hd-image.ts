import type { ZoomFeature } from 'medium-zoom/core'

import type { FeatureHooks } from '../engine/types'
import { createImageFrame, isImage } from '../targets/image'

export const loadHdImage: NonNullable<FeatureHooks['__mz_load']> = (
  { original, frame, appendFrame },
  ready
) => {
  if (!isImage(original) || !isImage(frame.content)) {
    return
  }
  const zoomed = frame.content
  const source = original.getAttribute('data-zoom-src')
  if (!source && !original.hasAttribute('srcset')) {
    return
  }
  // Install handlers before assigning sources: Firefox may queue a cached load.
  const hd = document.createElement('img')
  ;(Array.prototype.slice.call(zoomed.attributes) as Attr[]).forEach(({ name, value }) => {
    if (!/^(src|srcset|sizes|loading)$/.test(name)) {
      hd.setAttribute(name, value)
    }
  })
  const hdFrame = createImageFrame(hd)
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
    if (hd.naturalWidth) {
      hd.classList.add('medium-zoom-image--opened')
      zoomed.setAttribute('aria-hidden', 'true')
      appendFrame(hdFrame)
    } else {
      console.warn(`Unable to reach the zoom image target ${hd.currentSrc || hd.src}`)
    }
    ready(hd.naturalWidth ? hdFrame : undefined)
  }
  hd.addEventListener('load', finish)
  hd.addEventListener('error', finish)
  if (!source) {
    hd.srcset = zoomed.srcset
  }
  hd.src = source || zoomed.src
  return cleanup
}

export function hdImage(): ZoomFeature<{}> {
  const feature: FeatureHooks = {
    __mz_load: loadHdImage,
  }
  return feature as unknown as ZoomFeature<{}>
}
