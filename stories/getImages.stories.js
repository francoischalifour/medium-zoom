import { storiesOf } from '@storybook/html'

storiesOf('getImages()', module).add(
  'default',
  () => `
    <div>
      <img src="image-3.jpg">
    </div>

    <div>
      <img src="image-4.jpg">
    </div>

    <script>
      const zoom = mediumZoom('img');

      console.group('getImages()');
      console.log(zoom.getImages());
      console.groupEnd();
    </script>
  `,
  {
    notes: {
      markdown: `
Returns the zoom images.

_Check the console._`,
    },
  }
)
