import { storiesOf } from '@storybook/html'

storiesOf('off()', module)
  .add(
    'open',
    () => `
      <img src="image-2.jpg">

      <script>
        const zoom = mediumZoom('img');
        const onOpen = () => alert('open')

        zoom.on('open', onOpen);
        zoom.off('open', onOpen);
      </script>
    `,
    {
      notes: {
        markdown: 'Listens and removes the listener on `open`.',
      },
    }
  )
  .add(
    'opened',
    () => `
      <img src="image-2.jpg">

      <script>
        const zoom = mediumZoom('img');
        const onOpened = () => alert('opened')

        zoom.on('opened', onOpened);
        zoom.off('opened', onOpened);
      </script>
    `,
    {
      notes: {
        markdown: 'Listens and removes the listener on `opened`.',
      },
    }
  )
  .add(
    'close',
    () => `
      <img src="image-2.jpg">

      <script>
        const zoom = mediumZoom('img');
        const onClose = () => alert('close')

        zoom.on('close', onClose);
        zoom.off('close', onClose);
      </script>
    `,
    {
      notes: {
        markdown: 'Listens and removes the listener on `close`.',
      },
    }
  )
  .add(
    'closed',
    () => `
      <img src="image-2.jpg">

      <script>
        const zoom = mediumZoom('img');
        const onClosed = () => alert('closed')

        zoom.on('closed', onClosed);
        zoom.off('closed', onClosed);
      </script>
    `,
    {
      notes: {
        markdown: 'Listens and removes the listener on `closed`.',
      },
    }
  )
  .add(
    'detach',
    () => `
      <img src="image-2.jpg">

      <script>
        const zoom = mediumZoom('img');
        const onDetach = () => alert('detach')

        zoom.on('detach', onDetach);
        zoom.off('detach', onDetach);

        zoom.detach();
      </script>
    `,
    {
      notes: {
        markdown: 'Listens and removes the listener on `detach`.',
      },
    }
  )
