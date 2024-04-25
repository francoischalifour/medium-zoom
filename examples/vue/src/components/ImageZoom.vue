<script setup lang="ts">
import { watch, type ImgHTMLAttributes, type ComponentPublicInstance } from 'vue'
import mediumZoom, { type Zoom, type ZoomOptions } from 'medium-zoom'

interface Props extends ImgHTMLAttributes {
  options?: ZoomOptions
}

const props = defineProps<Props>()

let zoom: Zoom | null = null

function getZoom() {
  if (zoom === null) {
    zoom = mediumZoom(props.options)
  }

  return zoom
}

function attachZoom(ref: Element | ComponentPublicInstance | null) {
  const image = ref as HTMLImageElement | null
  const zoom = getZoom()

  if (image) {
    zoom.attach(image)
  } else {
    zoom.detach()
  }
}

watch(() => props.options, (options) => {
  const zoom = getZoom()
  zoom.update(options || {})
})
</script>

<template>
  <img :ref="attachZoom" />
</template>
