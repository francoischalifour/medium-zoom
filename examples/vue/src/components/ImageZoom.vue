<script setup lang="ts">
import { ref, onMounted, onUnmounted, onUpdated, type ImgHTMLAttributes } from 'vue'
import mediumZoom, { Zoom, ZoomOptions } from 'medium-zoom'

interface Props extends ImgHTMLAttributes {
  options?: ZoomOptions
}

const props = defineProps<Props>()

const imgRef = ref<HTMLImageElement | null>(null)
let zoom: Zoom

onMounted(() => {
  zoom = mediumZoom(props.options)

  if (imgRef.value) {
    zoom.attach(imgRef.value)
  }
})

onUpdated(() => {
  if (zoom) {
    zoom.update(props.options || {})
  }
})

onUnmounted(() => {
  if (zoom && imgRef.value) {
    zoom.detach(imgRef.value)
  }
})
</script>

<template>
  <img ref="imgRef" />
</template>
