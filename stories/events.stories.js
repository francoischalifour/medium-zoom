import { storiesOf } from '@storybook/html'

storiesOf('events', module)
  .add(
    'show',
    () => `
      <img src="image-2.jpg">
      <ol d="events"></ol>

      <script>
        const zoom = mediumZoom('img');

        zoom.addEventListeners('show', () => {
          alert('show');
        });
      </script>
    `,
    {
      notes: {
        markdown:
          'The `show` event fires immediately when the show instance method is called.',
      },
    }
  )
  .add(
    'shown',
    () => `
      <img src="image-2.jpg">

      <script>
        const zoom = mediumZoom('img');

        zoom.addEventListeners('shown', () => {
          alert('shown')
        });
      </script>
    `,
    {
      notes: {
        markdown:
          'The `shown` event fires when the zoom has finished being animated.',
      },
    }
  )
  .add(
    'hide',
    () => `
      <img src="image-2.jpg">

      <script>
        const zoom = mediumZoom('img');

        zoom.addEventListeners('hide', () => {
          alert('hide')
        });
      </script>
    `,
    {
      notes: {
        markdown:
          'The `hide` event fires immediately when the `hide` instance method is called.',
      },
    }
  )
  .add(
    'hidden',
    () => `
      <img src="image-2.jpg">

      <script>
        const zoom = mediumZoom('img');

        zoom.addEventListeners('hidden', () => {
          alert('hidden')
        });
      </script>
    `,
    {
      notes: {
        markdown:
          'The `hidden` event fires when the zoom out has finished being animated.',
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

        button.addEventListener('click', zoom.detach);

        zoom.addEventListeners('detach', () => {
          alert('detach')
        });
      </script>
    `,
    {
      notes: {
        markdown:
          'The `detach` event fires when the `detach` instance method is called.',
      },
    }
  )
