import { storiesOf } from '@storybook/html'

storiesOf('metaClick', module).add(
  'disabled',
  () => `
      <img src="image-5.jpg">

      <script>
        const zoom = mediumZoom('img', {
          metaClick: false,
        });
      </script>
    `,
  {
    notes: `
      This zoom disables meta clicks on the image (<kbd>⌘</kbd> or <kbd>Ctrl</kbd>).
      It doesn't open the link to the image.
      `,
  }
)
