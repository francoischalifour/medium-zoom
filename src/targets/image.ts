import { getScrollX, getScrollY, assign } from '#platform'

import type { Bounds, TargetMeasurement, FrameGeometry } from '../engine/geometry'
import { removeNode } from '../utils'
import type { RenderedFrame, TargetAdapter, ZoomTarget } from './types'

export const isSvgSource = (source: string): boolean => /\.svg$/i.test(source)

export const isImage = (target: ZoomTarget): target is HTMLImageElement => target.tagName === 'IMG'

/** The image frame owns the cloned node and the application of geometry/clipping. */
export function createImageFrame(image: HTMLImageElement): RenderedFrame {
  image.classList.add('medium-zoom-image')
  let geometry: FrameGeometry | null = null
  const style = image.style
  const initialClip = style.clipPath
  return {
    __mz_element: image,
    __mz_content: image,
    get __mz_label() {
      return image.alt.trim() || image.getAttribute('aria-label')?.trim() || ''
    },
    get __mz_geometry() {
      return geometry
    },
    __mz_measure(viewport) {
      return measureImage(image, viewport)
    },
    __mz_adopt(content) {
      if (!isImage(content)) {
        throw new TypeError('Expected an image')
      }
      return createImageFrame(adoptImage(image, content))
    },
    __mz_apply(next) {
      geometry = next
      transformImage(image, next)
      if (next.clip) {
        style.clipPath = `inset(${next.clip.top}px ${next.clip.right}px ${next.clip.bottom}px ${next.clip.left}px)`
      } else if (style.clipPath !== initialClip) {
        style.clipPath = initialClip
      }
    },
    __mz_setVisible(visible) {
      style.visibility = visible ? '' : 'hidden'
    },
    __mz_reset() {
      style.transform = ''
      if (style.clipPath !== initialClip) {
        style.clipPath = initialClip
      }
    },
    __mz_dispose() {
      removeNode(image)
    },
  }
}

export const imageAdapter: TargetAdapter<HTMLImageElement, string> = {
  supports: isImage,
  resolveSource(image) {
    return image.currentSrc || image.src
  },
  createFrame(image, source, coordinates) {
    const clone = cloneImage(image, source, coordinates)
    return createImageFrame(clone)
  },
}

export function measureImage(image: HTMLImageElement, viewport: Bounds): TargetMeasurement {
  const source = image.currentSrc || image.src
  const layout = image.getBoundingClientRect()
  // Retain v1's SVG-file sizing policy during extraction. Other SVG forms are separate work.
  const vector = isSvgSource(source)
  return {
    layout,
    painted: layout,
    intrinsic: {
      width: vector ? viewport.width : image.naturalWidth,
      height: vector ? viewport.height : image.naturalHeight,
    },
  }
}
export function cloneImage(
  image: HTMLImageElement,
  source: string,
  coordinates: 'document' | 'viewport'
): HTMLImageElement {
  const { left, top, width, height } = image.getBoundingClientRect()
  const clone = image.cloneNode() as HTMLImageElement
  clone.removeAttribute('id')
  assign(clone.style, {
    position: 'absolute',
    left: `${left + (coordinates === 'document' ? getScrollX() : 0)}px`,
    top: `${top + (coordinates === 'document' ? getScrollY() : 0)}px`,
    width: `${width}px`,
    height: `${height}px`,
    transform: '',
  })
  if (image.parentElement?.tagName === 'PICTURE' && image.currentSrc) {
    clone.src = source
  }
  clone.classList.add('medium-zoom-image')
  return clone
}
export function adoptImage(image: HTMLImageElement, content: HTMLImageElement): HTMLImageElement {
  content.style.cssText = image.style.cssText
  content.className = image.className
  return content
}
export function transformImage(image: HTMLElement | SVGElement, next: FrameGeometry): void {
  image.style.transform = `scale(${next.scale}) translate3d(${next.translateX}px, ${next.translateY}px, 0)`
}
