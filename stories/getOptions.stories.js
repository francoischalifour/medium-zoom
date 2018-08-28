import { storiesOf } from '@storybook/html'

storiesOf('getOptions()', module).add(
  'default',
  () => `
    <img src="image-2.jpg">

    <script>
      const zoom = mediumZoom({ background: '#000', margin: 48 });

      console.group('getOptions()');
      console.log(zoom.getOptions());
      console.groupEnd();
    </script>
  `,
  {
    notes: {
      markdown: `
Returns the zoom options.

_Check the console._`,
    },
  }
)
