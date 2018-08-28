import { storiesOf } from '@storybook/html'

storiesOf('getZoomedImage()', module).add(
  'default',
  () => `
    <img src="image-2.jpg">

    <script>
      const zoom = mediumZoom('img');

      console.group('getZoomedImage()');
      console.log(zoom.getZoomedImage());
      zoom.on('open', () => console.log(zoom.getZoomedImage()))
      console.groupEnd();
    </script>
  `,
  {
    notes: {
      markdown: `
Returns the zoom active target.

_Check the console._`,
    },
  }
)
