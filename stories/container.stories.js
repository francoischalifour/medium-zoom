import { storiesOf } from '@storybook/html'

storiesOf('container', module)
  .add(
    'within a DOM element',
    () => `
      <img src="image-1.jpg">

      <div id="zoom-container"></div>

      <script>
        const zoom = mediumZoom('img', {
          container: '#zoom-container',
          background: 'transparent',
        });
      </script>

      <style>
        #zoom-container {
          position: absolute;
          top: 300px;
          right: 0;
          height: 300px;
          width: 500px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.16);
          background: rgba(0, 0, 0, 0.1);
        }

        #zoom-container::before {
          content: 'container';
          height: 100%;
          margin: auto;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 2rem;
          color: #fff;
        }
      </style>
    `,
    {
      notes: `
        This is a zoom in a container specified as a DOM element.
      `,
    }
  )
  .add(
    'within coordinates',
    () => `
      <img src="image-1.jpg">

      <script>
        const zoom = mediumZoom('img', {
          container: {
            width: 500,
            height: 300,
            top: 300,
            right: 0,
          }
        });
      </script>
    `,
    {
      notes: `
        This is a zoom in a container specified as coordinates.
      `,
    }
  )
