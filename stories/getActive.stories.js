import { storiesOf } from '@storybook/html'

storiesOf('getActive()', module).add(
  'default',
  () => `
    <img src="image-2.jpg">

    <script>
      const zoom = mediumZoom('img');

      console.group('getActive()');
      console.log(zoom.getActive());
      zoom.on('open', () => console.log(zoom.getActive()))
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
