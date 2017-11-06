import React, { Component } from 'react'
import mediumZoom from 'medium-zoom'

class App extends Component {
  attachZoom = image => {
    mediumZoom(image)
  }

  render() {
    return (
      <article className="container">
        <img src="images/image-1.jpg" alt="Image 1" ref={this.attachZoom} />

        <p>
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Tempora
          praesentium cupiditate fugit voluptas, rem eligendi, voluptatem
          molestias. Doloremque sit voluptatum odio maiores provident
          consequuntur accusantium saepe.
        </p>

        <img src="images/image-2.jpg" alt="Image 2" ref={this.attachZoom} />

        <p>
          Lorem ipsum dolor sit amet, consectetur adipisicing elit. Ea dolores
          quaerat, quis modi nostrum sequi adipisci ratione esse blanditiis
          error beatae vel non vero dolor nemo. Animi nemo quisquam ducimus!
        </p>

        <img src="images/image-3.jpg" alt="Image 3" ref={this.attachZoom} />
      </article>
    )
  }
}

export default App
