(function() {
  // Show placeholders for paragraphs
  var paragraphs = Array.apply(null, document.querySelectorAll('p.placeholder'))
  paragraphs.forEach(function(p) {
    var content = p.textContent
      .split(' ')
      .filter(function(text) {
        return text.length > 4
      })
      .map(function(text) {
        return '<span class="placeholder__word">' + text + '</span>'
      })
      .join(' ')

    p.innerHTML = content
  })

  // Handle the zoom on click on the button
  var zoomToTrigger = mediumZoom('#zoom-trigger')
  var button = document.querySelector('#btn-trigger')
  button.addEventListener('click', function() {
    zoomToTrigger.show()
  })

  // Add a zoom to be detached
  var zoomToDetach = mediumZoom('#zoom-detach')
  zoomToDetach.addEventListeners('hidden', zoomToDetach.detach)

  mediumZoom('.zoom-srcset')

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

  // Log all interactions in the history
  var history = document.querySelector('#history')

  containerZoom.forEach(function(zoom) {
    zoom.addEventListeners('show', function(event) {
      var time = new Date().toLocaleTimeString()
      history.innerHTML +=
        '<p>▶ "' + event.target.alt + '" was zoomed at ' + time
    })

    zoom.addEventListeners('detach', function(event) {
      var time = new Date().toLocaleTimeString()
      history.innerHTML +=
        '<p>▶ "' + event.target.alt + '" was detached at ' + time
    })
  })
})()
