import { storiesOf } from '@storybook/html'

storiesOf('close()', module).add(
  'default',
  () =>
    `
      <div>
        <img id="image-1" src="image-3.jpg">
      </div>

      <div>
        <img id="image-2" src="image-4.jpg">
      </div>

      <script>
        const zoom = mediumZoom('img');
        zoom
          .open()
          .then(zoom => zoom.close());
      </script>
    `,
  {
    notes: {
      markdown: `Opens and closes the zoom.`,
    },
  }
)
