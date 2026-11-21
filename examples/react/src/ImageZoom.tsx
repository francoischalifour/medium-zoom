import mediumZoom, { type Zoom, type ZoomOptions } from 'medium-zoom'
import {
  type ComponentPropsWithoutRef,
  useCallback,
  useEffect,
  useRef,
} from 'react'

type ImageZoomProps = ComponentPropsWithoutRef<'img'> & {
  options?: ZoomOptions
}

export function ImageZoom({ options, ...props }: ImageZoomProps) {
  const zoomRef = useRef<Zoom | null>(null)
  const attachZoom = useCallback((image: HTMLImageElement | null) => {
    if (image) {
      zoomRef.current = mediumZoom(image)
    } else {
      zoomRef.current?.detach()
      zoomRef.current = null
    }
  }, [])

  useEffect(() => {
    if (options) {
      zoomRef.current?.update({ ...options })
    }
  }, [options])

  return <img {...props} ref={attachZoom} />
}
