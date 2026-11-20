import { getScrollX, getScrollY, assign } from '#platform'

import { fitBox, type Bounds } from './geometry'

export type ZoomTarget = HTMLElement | SVGElement

/**
 * A frame is the image element the engine animates: a clone of the source, or media a
 * loader supplied. The engine owns its placement, geometry and removal.
 */
export type Frame = HTMLImageElement

export const isImage = (target: ZoomTarget): target is HTMLImageElement => target.tagName === 'IMG'

const isSvgSource = (source: string): boolean => /\.svg$/i.test(source)

/** Clone the source over itself: in document coordinates, or the viewport's for a fixed host. */
export function cloneImage(image: HTMLImageElement, fixed?: unknown): Frame {
  const { left, top, width, height } = image.getBoundingClientRect()
  const clone = image.cloneNode() as HTMLImageElement
  clone.removeAttribute('id')
  assign(clone.style, {
    position: 'absolute',
    left: `${left + (fixed ? 0 : getScrollX())}px`,
    top: `${top + (fixed ? 0 : getScrollY())}px`,
    width: `${width}px`,
    height: `${height}px`,
    transform: '',
  })
  // A picture's selected source can differ from the image's own src.
  if (image.parentElement && image.parentElement.tagName === 'PICTURE' && image.currentSrc) {
    clone.src = image.currentSrc
  }
  clone.classList.add('medium-zoom-image')
  return clone
}

export function fitImage(frame: Frame, viewport: Bounds): string | null {
  // SVG files have no reliable intrinsic size: let them fill the viewport.
  const vector = isSvgSource(frame.currentSrc || frame.src)
  return fitBox(
    frame.getBoundingClientRect(),
    vector ? viewport.width : frame.naturalWidth,
    vector ? viewport.height : frame.naturalHeight,
    viewport
  )
}
