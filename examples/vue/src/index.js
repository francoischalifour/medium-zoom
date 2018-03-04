import mediumZoom from 'medium-zoom'

new Vue({
  el: '#app',
  mounted() {
    mediumZoom('.container img')
  }
})
