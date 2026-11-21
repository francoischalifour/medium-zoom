import { storiesOf } from '@storybook/html'

storiesOf('on()', module)
  .add(
    'open',
    () => `
      <img src="image-2.jpg">

      <script>
        const zoom = mediumZoom('img');

        zoom.on('open', () => alert('open'));
      </script>
    `,
    {
      notes: {
        markdown:
          'The `open` event fires immediately when the open method is called.',
      },
    }
  )
  .add(
    'opened',
    () => `
      <img src="image-2.jpg">

      <script>
        const zoom = mediumZoom('img');

        zoom.on('opened', () => alert('opened'));
      </script>
    `,
    {
      notes: {
        markdown:
          'The `opened` event fires when the zoom has finished being animated.',
      },
    }
  )
  .add(
    'close',
    () => `
      <img src="image-2.jpg">

      <script>
        const zoom = mediumZoom('img');

        zoom.on('close', () => alert('close'));
      </script>
    `,
    {
      notes: {
        markdown:
          'The `close` event fires immediately when the `close` instance method is called.',
      },
    }
  )
  .add(
    'closed',
    () => `
      <img src="image-2.jpg">

      <script>
        const zoom = mediumZoom('img');

        zoom.on('closed', () => alert('closed'));
      </script>
    `,
    {
      notes: {
        markdown:
          'The `closed` event fires when the zoom out has finished being animated.',
      },
    }
  )
  .add(
    'detach',
    () => `
      <img src="image-2.jpg">

      <div>
        <button id="detach">Detach</button>
      </div>

      <script>
        const zoom = mediumZoom('img');
        const button = document.querySelector('#detach');

        button.addEventListener('click', () => zoom.detach());
        zoom.on('detach', () => alert('detach'), { once: true });
      </script>
    `,
    {
      notes: {
        markdown: `The \`detach\` event fires when the \`detach\` instance method is called.
          Once detached, the image is not part of the zoom anymore.`,
      },
    }
  )
  .add(
    'open only once',
    () => `
      <img src="image-2.jpg">

      <script>
        const zoom = mediumZoom('img');

        zoom.on('open', () => alert('open'), { once: true });
      </script>
    `,
    {
      notes: {
        markdown:
          'The `open` event fires immediately and only once when the open method is called.',
      },
    }
  )
