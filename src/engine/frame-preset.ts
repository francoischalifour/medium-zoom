import { cloneImage, isImage, isSvgSource } from '../targets/image'
import type { FrameSurface, ZoomTarget } from '../targets/types'
import { removeNode } from '../utils'
import type { FrameProfile } from './frame-profile'
import { imageTransform } from './geometry'

/** Fixed presets accept images only. Their frames need no dynamic operation table or modal state. */
const image = (frame: FrameSurface) => frame.__mz_content as HTMLImageElement
const surface = (element: HTMLImageElement): FrameSurface => ({
  __mz_element: element,
  __mz_content: element,
})
export const targetResolver: FrameProfile['targetResolver'] = () => {
  return {
    supports: isImage,
    create(target: ZoomTarget) {
      const source = target as HTMLImageElement
      return surface(cloneImage(source, source.currentSrc || source.src, 'document'))
    },
  }
}
// The fixed HD loader copies presentation attributes before assigning its source.
// eslint-disable-next-line no-unused-vars -- The common frame protocol also supplies the previous frame.
export const adoptFrame = (_frame: FrameSurface, content: ZoomTarget) => {
  // Inline load handlers can replace the copied class before adoption.
  content.classList.add('medium-zoom-image--opened')
  return surface(content as HTMLImageElement)
}
export const positionFrames: FrameProfile['positionFrames'] = (frames, target, viewport) => {
  const content = image(target)
  const source = content.currentSrc || content.src
  const vector = isSvgSource(source)
  const transform = imageTransform(
    content.getBoundingClientRect(),
    vector ? viewport.width : content.naturalWidth,
    vector ? viewport.height : content.naturalHeight,
    viewport
  )
  if (transform) {
    frames.forEach(frame => {
      frame.__mz_element.style.transform = transform
    })
  }
}
export const resetFrame = (frame: FrameSurface) => {
  frame.__mz_element.style.transform = ''
}
export const disposeFrame = (frame: FrameSurface): void => {
  removeNode(frame.__mz_element)
}
// These modal operations are unreachable in fixed presets and disappear from their output.
export const frameGeometry: FrameProfile['frameGeometry'] = () => null
export const frameLabel = () => ''
export const showFrame = (frame: FrameSurface, visible: boolean) => {
  frame.__mz_element.style.visibility = visible ? '' : 'hidden'
}
