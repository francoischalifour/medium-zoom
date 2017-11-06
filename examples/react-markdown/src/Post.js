import React, { Component } from 'react'
import ReactMarkdown from 'react-markdown'
import mediumZoom from 'medium-zoom'

class Post extends Component {
  componentDidMount () {
    this.zoom = mediumZoom('.container img')
  }

  componentWillUnmount () {
    this.zoom.detach()
  }

  render () {
    return (
      <article className='container'>
        <ReactMarkdown source={this.props.post} />
      </article>
    )
  }
}

export default Post
