import React from 'react'
import ReactMarkdown from 'react-markdown'
import mediumZoom from 'medium-zoom'

function Post({ post }) {
  React.useEffect(() => {
    const zoom = mediumZoom('.container img')

    return () => {
      zoom.detach()
    }
  }, [])

  return (
    <article className="container">
      <h1>React Markdown demo</h1>

      <ReactMarkdown source={post} />
    </article>
  )
}

export default Post
