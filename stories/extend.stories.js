import { storiesOf } from '@storybook/html'

storiesOf('extend()', module).add(
  'with margin',
  () => `
    <img src="image-2.jpg">

    <script>
      const zoom = mediumZoom({ background: '#000' });
      const extendedZoom = zoom.extend({ margin: 100 })
      extendedZoom.attach('img')
    </script>
  `,
  {
    notes: {
      markdown: `This zoom extends an existing zoom and add margins.`,
    },
  }
)
