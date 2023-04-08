import React, { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import mediumZoom from 'medium-zoom'

const markdown = `
![Zoom 1](images/image-1.jpg)

Lorem ipsum dolor sit amet, consectetur adipisicing elit. Tempora praesentium cupiditate fugit voluptas, rem eligendi, voluptatem molestias. Doloremque sit voluptatum odio maiores provident consequuntur accusantium saepe.

![Zoom 2](images/image-2.jpg)

Lorem ipsum dolor sit amet, consectetur adipisicing elit.
Ea dolores quaerat, quis modi nostrum sequi adipisci ratione esse blanditiis error beatae vel non vero dolor nemo. Animi nemo quisquam ducimus!

![Zoom 3](images/image-3.jpg)
`

export function App() {
  useEffect(() => {
    const zoom = mediumZoom('.container img')

    return () => {
      zoom.detach()
    }
  }, [])

  return (
    <article className="container">
      <h1>Medium Zoom React Markdown demo</h1>

      <ReactMarkdown children={markdown} />
    </article>
  )
}
