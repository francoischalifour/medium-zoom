import { assign, getScrollX, getScrollY } from '#platform'

import { fitBox, type ZoomBounds } from './geometry'

declare const __PRESET__: boolean

export type ZoomTarget = HTMLElement | SVGElement

/**
 * A frame is the image element the engine animates: a clone of the source, or media a
 * loader supplied. The engine owns its placement, geometry and removal.
 */
export type Frame = HTMLImageElement

export const isImage = (target: ZoomTarget): target is HTMLImageElement =>
  target.tagName === 'IMG'

const isSvgSource = (source: string): boolean => /\.svg$/i.test(source)

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
  // The clone is outside the picture, so copy the source its picture selected.
  if (
    image.parentElement &&
    image.parentElement.tagName === 'PICTURE' &&
    image.currentSrc
  ) {
    clone.src = image.currentSrc
  }
  clone.classList.add('medium-zoom-image')
  return clone
}

/** `fill` fits the frame to the viewport whatever its own size, like an SVG file. */
export function fitImage(
  frame: Frame,
  viewport: ZoomBounds,
  fill?: boolean
): string | null {
  // SVG files have no reliable intrinsic size: let them fill the viewport.
  const vector =
    (!__PRESET__ && fill) || isSvgSource(frame.currentSrc || frame.src)
  return fitBox(
    frame.getBoundingClientRect(),
    vector ? 0 : frame.naturalWidth,
    vector ? 0 : frame.naturalHeight,
    viewport
  )
}
