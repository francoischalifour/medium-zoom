import type { GalleryController } from '../../src/gallery'
import type { DialogOptions } from '../../src/renderers'
export function mountCloseControl(
  view: Parameters<NonNullable<DialogOptions['content']>>[0]
): () => void
export function mountExampleControls(
  element: HTMLElement,
  gallery: GalleryController,
  options?: {
    previousLabel?: string
    nextLabel?: string
    positionLabel?: (position: number, total: number) => string
  }
): () => void
