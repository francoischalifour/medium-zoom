import { storiesOf } from '@storybook/html'

storiesOf('scrollOffset', module)
  .add(
    'without scroll offset',
    () => `
      <img src="image-1.jpg">

      <script>
        const zoom = mediumZoom('img', {
          scrollOffset: 0,
        });
      </script>
    `,
    {
      notes: `
        This is a zoom without scroll offset.
        It's dismissed as soon as you scroll.
      `,
    }
  )
  .add(
    'default',
    () => `
      <img src="image-1.jpg">

      <script>
        const zoom = mediumZoom('img');
      </script>
    `,
    {
      notes: `
        This is a zoom with default scroll offset.
        You need to scroll a little to dismiss the zoom.
      `,
    }
  )
