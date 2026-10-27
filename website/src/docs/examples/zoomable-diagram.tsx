import {
  ImageZoom,
  type ImageZoomProps,
} from '@/components/ui/image-zoom'

type ZoomableDiagramProps = Omit<ImageZoomProps, 'src'> & {
  svg: string
}

export function ZoomableDiagram({
  svg,
  style,
  ...props
}: ZoomableDiagramProps) {
  return (
    <ImageZoom
      {...props}
      src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
      style={{ width: '100%', maxWidth: 560, height: 'auto', ...style }}
    />
  )
}
