import { storiesOf } from '@storybook/html'

storiesOf('detach()', module)
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
        const zoom = mediumZoom('img');
        zoom.detach('#image-1');
      </script>
    `,
    {
      notes: {
        markdown: `Detaches the first image from the zoom with a string selector.`,
      },
    }
  )
  .add(
    'with Node selector',
    () =>
      `
      <div>
        <img id="image-1" src="image-3.jpg">
      </div>

      <div>
        <img id="image-2" src="image-4.jpg">
      </div>

      <script>
        const zoom = mediumZoom('img');
        zoom.detach(document.querySelector('#image-1'));
      </script>
    `,
    {
      notes: {
        markdown: `Detaches the first image from the zoom with a Node selector.`,
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
        const zoom = mediumZoom('img');
        zoom.detach('#image-1', '#image-2');
      </script>
    `,
    {
      notes: {
        markdown: `Detaches the images from the zoom with a multiple selectors.`,
      },
    }
  )
  .add(
    'all',
    () =>
      `
      <div>
        <img id="image-1" src="image-3.jpg">
      </div>

      <div>
        <img id="image-2" src="image-4.jpg">
      </div>

      <script>
        const zoom = mediumZoom('img');
        zoom.detach();
      </script>
    `,
    {
      notes: {
        markdown: `Detaches all images from the zoom without selectors.`,
      },
    }
  )
