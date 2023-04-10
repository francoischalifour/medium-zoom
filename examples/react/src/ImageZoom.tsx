import { useRef, ComponentProps, RefCallback } from 'react'
import mediumZoom, { Zoom, ZoomOptions } from 'medium-zoom'

type ImageZoomProps = ComponentProps<'img'> & {
  options?: ZoomOptions
}

export function ImageZoom({ options, ...props }: ImageZoomProps) {
  const zoomRef = useRef<Zoom | null>(null)

  function getZoom() {
    if (zoomRef.current === null) {
      zoomRef.current = mediumZoom(options)
    }

    return zoomRef.current
  }

  const attachZoom: RefCallback<HTMLImageElement> = node => {
    const zoom = getZoom()

    if (node) {
      zoom.attach(node)
    } else {
      zoom.detach()
    }
  }

  return <img {...props} ref={attachZoom} />
}
