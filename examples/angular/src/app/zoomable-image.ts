import { afterRenderEffect, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core'
import mediumZoom, { type Zoom, type ZoomOptions } from 'medium-zoom'

@Directive({ selector: 'img[appZoomable]' })
export class ZoomableImage {
  readonly zoomOptions = input<ZoomOptions>({})

  constructor() {
    const image = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement
    let zoom: Zoom | undefined

    // Render effects only run in the browser, after Angular updates the DOM.
    afterRenderEffect(() => {
      const options = this.zoomOptions()
      if (zoom) {
        zoom.update(options)
      } else {
        zoom = mediumZoom(image, options)
      }
    })

    inject(DestroyRef).onDestroy(() => zoom?.detach())
  }
}
