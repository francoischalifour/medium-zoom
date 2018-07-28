import { storiesOf } from '@storybook/html'

storiesOf('background', module)
  .add(
    'dark',
    () =>
      `
      <img src="image-3.jpg">

      <script>
        const zoom = mediumZoom('img', {
          background: '#212530',
        });
      </script>
    `,
    {
      notes: `
        This is a zoom with a black background.
      `,
    }
  )
  .add(
    'transparent',
    () =>
      `
      <img src="image-4.jpg">

      <script>
        const zoom = mediumZoom('img', {
          background: 'rgba(25, 18, 25, .8)',
        });
      </script>

      <style>
        #wrapper::before {
          content: '';
          width: 100%;
          height: 100%;
          background-image: url(image-4.jpg);
          background-size: cover;
          background-position: center center;
          filter: blur(5px);
          transform: scale(2);
          position: absolute;
          z-index: -1;
        }
      </style>
    `,
    {
      notes: `
        This is a zoom with a transparent background.
      `,
    }
  )
