(function() {
  var zoomFacebook = mediumZoom('.container img', {
    background: 'rgba(0, 0, 0, 0.9)',
    template: '#template-facebook',
    container: '[data-zoom-container]'
  })

  // You can start manipulating the DOM after the `shown` event has been triggered
  zoomFacebook.addEventListeners('shown', function() {
    var closeButton = document.querySelector('[data-zoom-close]')
    closeButton.addEventListener('click', zoomFacebook.hide)
  })

  // Block scroll on zoom
  zoomFacebook.addEventListeners('show', function() {
    document.body.style.overflow = 'hidden'
  })
  zoomFacebook.addEventListeners('hide', function() {
    document.body.style.overflow = ''
  })
})()
