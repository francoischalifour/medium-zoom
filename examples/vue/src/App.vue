<script setup lang="ts">
import ImageZoom from './components/ImageZoom.vue'
</script>

<template>
  <article class="container">
    <h1>Medium Zoom Vue demo</h1>

    <ImageZoom src="images/image-1.jpg" alt="Zoom 1" />

    <p>
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Tempora
      praesentium cupiditate fugit voluptas, rem eligendi, voluptatem molestias.
      Doloremque sit voluptatum odio maiores provident consequuntur accusantium
      saepe.
    </p>

    <ImageZoom src="images/image-2.jpg" alt="Zoom 2" />

    <p>
      Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ea dolores
      quaerat, quis modi nostrum sequi adipisci ratione esse blanditiis error
      beatae vel non vero dolor nemo. Animi nemo quisquam ducimus!
    </p>

    <ImageZoom
      src="images/image-3.jpg"
      alt="Zoom 3"
      :options="{ background: 'black' }"
    />
  </article>
</template>
