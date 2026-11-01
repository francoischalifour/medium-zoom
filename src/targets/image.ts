import { getScrollX, getScrollY } from '#platform'

import type { FrameGeometry } from '../engine/geometry'
import type { RenderedFrame, TargetAdapter, ZoomTarget } from './types'

export const isImage = (target: ZoomTarget): target is HTMLImageElement => target.tagName === 'IMG'

/** The image frame owns the cloned node and the application of geometry/clipping. */
export function createImageFrame(image: HTMLImageElement): RenderedFrame {
  let geometry: FrameGeometry | null = null
  const initialClip = image.style.clipPath
  return {
    element: image,
    content: image,
    get label() {
      return image.alt.trim() || image.getAttribute('aria-label')?.trim() || ''
    },
    get geometry() {
      return geometry
    },
    apply(next) {
      geometry = next
      image.style.transform = `scale(${next.scale}) translate3d(${next.translateX}px, ${next.translateY}px, 0)`
      if (next.clip) {
        image.style.clipPath = `inset(${next.clip.top}px ${next.clip.right}px ${next.clip.bottom}px ${next.clip.left}px)`
      } else if (image.style.clipPath !== initialClip) {
        image.style.clipPath = initialClip
      }
    },
    setVisible(visible) {
      image.style.visibility = visible ? '' : 'hidden'
    },
    reset() {
      image.style.transform = ''
      if (image.style.clipPath !== initialClip) {
        image.style.clipPath = initialClip
      }
    },
    dispose() {
      if (image.parentNode) {
        image.parentNode.removeChild(image)
      }
    },
  }
}

export const imageAdapter: TargetAdapter<HTMLImageElement, string> = {
  supports: isImage,
  resolveSource(image) {
    return image.currentSrc || image.src
  },
  measure(image, source, viewport) {
    const layout = image.getBoundingClientRect()
    // Retain v1's SVG-file sizing policy during extraction. Other SVG forms are separate work.
    const vector = source.substr(-4).toLowerCase() === '.svg'
    return {
      layout,
      painted: layout,
      intrinsic: {
        width: vector ? viewport.width : image.naturalWidth,
        height: vector ? viewport.height : image.naturalHeight,
      },
    }
  },
  createFrame(image, source, coordinates) {
    const { left, top, width, height } = image.getBoundingClientRect()
    const clone = image.cloneNode() as HTMLImageElement
    clone.removeAttribute('id')
    clone.style.position = 'absolute'
    clone.style.left = `${left + (coordinates === 'document' ? getScrollX() : 0)}px`
    clone.style.top = `${top + (coordinates === 'document' ? getScrollY() : 0)}px`
    clone.style.width = `${width}px`
    clone.style.height = `${height}px`
    clone.style.transform = ''
    if (image.parentElement?.tagName === 'PICTURE' && image.currentSrc) {
      clone.src = source
    }
    return createImageFrame(clone)
  },
}
