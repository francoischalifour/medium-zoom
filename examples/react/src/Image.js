import React, { Component } from 'react'

class Image extends Component {
  zoom = this.props.zoom.clone({
    background: this.props.background,
  })

  attachZoom = image => {
    this.zoom.attach(image)
  }

  render() {
    return (
      <img src={this.props.src} alt={this.props.alt} ref={this.attachZoom} />
    )
  }
}

export default Image
