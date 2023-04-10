<script>
  import mediumZoom from 'medium-zoom'

  export let src = undefined
  export let alt = undefined
  export let options = undefined

  let zoom = null

  function getZoom() {
    if (zoom === null) {
      zoom = mediumZoom(options)
    }

    return zoom
  }

  function attachZoom(image) {
    const zoom = getZoom()
    zoom.attach(image)

    return {
      update(newOptions) {
        zoom.update(newOptions)
      },
      destroy() {
        zoom.detach()
      },
    }
  }
</script>

<img {src} {alt} {...$$restProps} use:attachZoom={options} />
