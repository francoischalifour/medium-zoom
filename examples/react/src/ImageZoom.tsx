import { ComponentProps, useRef } from 'react'
import mediumZoom, { Zoom, ZoomOptions } from 'medium-zoom'

type ImageZoomProps = ComponentProps<'img'> & {
  options?: ZoomOptions
}

export function ImageZoom({ options, ...props }: ImageZoomProps) {
  const zoomRef = useRef<Zoom | null>(null)

  if (zoomRef.current === null) {
    zoomRef.current = mediumZoom(options)
  }

  const zoom = zoomRef.current!

  function attachZoom(image: HTMLImageElement) {
    if (image) {
      zoom.attach(image)
    } else {
      zoom.detach(image)
    }
  }

  return <img {...props} ref={attachZoom} />
}
