import React, { Component } from 'react'
import mediumZoom from 'medium-zoom'
import Image from './Image'

class App extends Component {
  zoom = mediumZoom()

  attachZoom = image => {
    this.zoom.attach(image)
  }

  render() {
    return (
      <article className="container">
        <h1>React demo</h1>

        <Image
          src="images/image-1.jpg"
          alt="Zoom 1"
          zoom={this.zoom}
          background="#000"
        />

        <p>
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Tempora
          praesentium cupiditate fugit voluptas, rem eligendi, voluptatem
          molestias. Doloremque sit voluptatum odio maiores provident
          consequuntur accusantium saepe.
        </p>

        <Image
          src="images/image-2.jpg"
          alt="Zoom 2"
          zoom={this.zoom}
          background="red"
        />

        <p>
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ea dolores
          quaerat, quis modi nostrum sequi adipisci ratione esse blanditiis
          error beatae vel non vero dolor nemo. Animi nemo quisquam ducimus!
        </p>

        <Image
          src="images/image-3.jpg"
          alt="Zoom 3"
          zoom={this.zoom}
          background="yellow"
        />
      </article>
    )
  }
}

export default App
