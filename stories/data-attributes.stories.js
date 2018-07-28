import { storiesOf } from '@storybook/html'

storiesOf('data attributes', module).add(
  'data-zoom-target',
  () => `
      <img
        src="https://placehold.it/300x500?text=default-image"
        data-zoom-target="https://placehold.it/1440x1920?text=data-zoom-target"
      >

      <script>
        const zoom = mediumZoom('img');
      </script>
  `,
  {
    notes: {
      markdown: `Zoom on an image having a \`data-zoom-target\` attribute.`,
    },
  }
)
