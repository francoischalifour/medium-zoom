import { storiesOf } from '@storybook/html'

storiesOf('getZoomedTarget()', module).add(
  'default',
  () => `
    <img src="image-2.jpg">

    <script>
      const zoom = mediumZoom('img');

      console.group('getZoomedTarget()');
      console.log(zoom.getZoomedTarget());
      zoom.on('open', () => console.log(zoom.getZoomedTarget()))
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
