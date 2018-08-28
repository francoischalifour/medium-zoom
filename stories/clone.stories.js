import { storiesOf } from '@storybook/html'

storiesOf('clone()', module).add(
  'with margin',
  () => `
    <img src="image-2.jpg">

    <script>
      const zoom = mediumZoom({ background: '#000' });
      const clonedZoom = zoom.clone({ margin: 100 })
      clonedZoom.attach('img')
    </script>
  `,
  {
    notes: {
      markdown: `This zoom clones an existing zoom and add margins.`,
    },
  }
)
