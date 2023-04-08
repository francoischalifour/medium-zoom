<script>
  import { onMount, onDestroy } from 'svelte'
  import mediumZoom from 'medium-zoom'

  export let src = ''
  export let alt = ''
  export let options = {}

  let imgElement
  let zoom

  onMount(() => {
    zoom = mediumZoom(options)
    zoom.attach(imgElement)

    return () => {
      zoom.detach(imgElement)
    }
  })

  onDestroy(() => {
    if (zoom) {
      zoom.detach(imgElement)
    }
  })
</script>

<img {src} {alt} {...$$restProps} bind:this={imgElement} />
