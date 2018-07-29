import { storiesOf } from '@storybook/html'

storiesOf('margin', module).add(
  'with margin',
  () => `
    <img src="image-2.jpg">

    <script>
      const zoom = mediumZoom('img', {
        margin: 80,
      });
    </script>
    `,
  {
    notes: `
        This is a zoom with a margin of 80px.
      `,
  }
)
