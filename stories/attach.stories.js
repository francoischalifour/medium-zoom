import { storiesOf } from '@storybook/html'

storiesOf('attach()', module)
  .add(
    'with string selector',
    () =>
      `
      <div>
        <img id="image-1" src="image-3.jpg">
      </div>

      <div>
        <img id="image-2" src="image-4.jpg">
      </div>

      <script>
        const zoom = mediumZoom();
        zoom.attach('img');
      </script>
    `,
    {
      notes: {
        markdown: `Attaches the zoom with a string selector.`,
      },
    }
  )
  .add(
    'with Node selector',
    () =>
      `
      <div>
        <img src="image-3.jpg">
      </div>

      <script>
        const zoom = mediumZoom();
        zoom.attach(document.querySelector('img'));
      </script>
    `,
    {
      notes: {
        markdown: `Attaches the zoom with a Node selector.`,
      },
    }
  )
  .add(
    'with multiple selectors',
    () =>
      `
      <div>
        <img id="image-1" src="image-3.jpg">
      </div>

      <div>
        <img id="image-2" src="image-4.jpg">
      </div>

      <script>
        const zoom = mediumZoom();
        zoom.attach('#image-1', '#image-2');
      </script>
    `,
    {
      notes: {
        markdown: `Attaches the zoom with multiple selectors.`,
      },
    }
  )
