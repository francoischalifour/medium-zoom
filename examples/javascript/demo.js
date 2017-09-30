(function () {
  // Handle the zoom on click on the button
  var zoomToTrigger = mediumZoom('#zoom-trigger')
  var button = document.querySelector('#btn-trigger')
  button.addEventListener('click', function () {
    zoomToTrigger.show()
  })

  // Add a zoom to be detached
  var zoomToDetach = mediumZoom('#zoom-detach')
  zoomToDetach.addEventListeners('hidden', zoomToDetach.detach)

  // Add zooms to a container
  var containerZoom = [
    mediumZoom('#zoom-default'),
    mediumZoom('#zoom-margin', {
      margin: 48
    }),
    mediumZoom('#zoom-background', {
      background: '#212530'
    }),
    mediumZoom('#zoom-scrollOffset', {
      scrollOffset: 0,
      background: 'rgba(25, 18, 25, .9)'
    }),
    mediumZoom('#zoom-metaClick', {
      metaClick: false
    }),
    zoomToTrigger,
    zoomToDetach
  ]

  // Write in the journal every time an image is zoomed
  var journal = document.querySelector('#journal')

  containerZoom.forEach(function (zoom) {
    zoom.addEventListeners('show', function (event) {
      var time = (new Date()).toLocaleTimeString()
      journal.innerHTML += '<p>❯ "' + event.target.alt + '" was zoomed at ' + time
    })

    zoom.addEventListeners('detach', function (event) {
      var time = (new Date()).toLocaleTimeString()
      journal.innerHTML += '<p>❯ "' + event.target.alt + '" was detached at ' + time
    })
  })
})()
