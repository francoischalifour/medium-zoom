import { storiesOf } from '@storybook/html'

storiesOf('default', module).add(
  'without options',
  () => `
      <img src="image-1.jpg">

      <script>
        const zoom = mediumZoom('img');
      </script>
    `,
  {
    notes: `
        This is the default zoom.
      `,
  }
)
