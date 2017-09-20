import React, { Component } from 'react'
import ReactMarkdown from 'react-markdown'
import mediumZoom from 'medium-zoom'
import './Post.css'
import config from './config'
import Header from './Header'
import Footer from './Footer'

class Post extends Component {
  componentDidMount () {
    // Handle the zoom on click on the button
    const zoomToTrigger = mediumZoom('#zoom-trigger')
    const button = document.querySelector('#btn-trigger')
    button.addEventListener('click', () => {
      zoomToTrigger.show()
    })

    // Add a zoom to be detached after 5 seconds
    const zoomToDetach = mediumZoom('#zoom-detach')
    setTimeout(function () {
      zoomToDetach.detach()
    }, 5000)

    // Create a container to detach all zooms in the end of the component lifecycle
    this.zooms = [
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
    const journal = document.querySelector('#journal')

    this.zooms.forEach(zoom => {
      zoom.addEventListeners('show', event => {
        const time = (new Date()).toLocaleTimeString()
        journal.innerHTML += `<p>❯ "${event.target.alt}" was zoomed at ${time}`
      })

      zoom.addEventListeners('detach', event => {
        const time = (new Date()).toLocaleTimeString()
        journal.innerHTML += `<p>❯ "${event.target.alt}" was detached at ${time}`
      })
    })
  }

  componentWillUnmount () {
    this.zooms.forEach(zoom => zoom.detach())
  }

  render () {
    return (
      <div>
        <Header {...config} />

        <article className='container'>
          <ReactMarkdown source={this.props.post} />
        </article>

        <Footer {...config} />
      </div>
    )
  }
}

export default Post
