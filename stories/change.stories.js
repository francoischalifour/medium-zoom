import { storiesOf } from '@storybook/html'

storiesOf('change()', module).add(
  'default',
  () =>
    `
      <template id="template">
        <div class="template-wrapper">
          <header class="template-header">
            <button data-zoom-previous>PREVIOUS</button>
            <button data-zoom-next>NEXT</button>
          </header>
          <div class="template-container" data-zoom-container data-zoom-close></div>
        </div>
      </template>

      <div style="display: flex; align-items: center;">
        <div style="flex: 1;">
          <img srcset="
            image-1x300.jpg 300w,
            image-1x600.jpg 600w,
            image-1x800.jpg 800w,
            image-1x1000.jpg 1000w,
            image-1x1200.jpg 1200w
          ">
        </div>

        <div style="flex: 1;">
          <img id="image-2" src="image-2.jpg">
        </div>

        <div style="flex: 1;">
          <img id="image-3" src="image-3.thumbnail.jpg" data-zoom-src="image-3.jpg">
        </div>
      </div>

      <script>
        const zoom = mediumZoom('img', {
          template: '#template',
          container: '[data-zoom-container]',
        });

        zoom.on('opened', () => {
          const closeButton = document.querySelector('[data-zoom-close]');
          closeButton.addEventListener('click', () => zoom.close());

          const nextButton = document.querySelector('[data-zoom-next]');
          const previousButton = document.querySelector('[data-zoom-previous]');
          nextButton.addEventListener('click', () => {
            const images = zoom.getImages();
            const imageIndex = images.indexOf(zoom.getZoomedImage());
            const newIndex = images.length === imageIndex ? 0 : imageIndex + 1;
            zoom.change({ target: images[newIndex] });
          });
          previousButton.addEventListener('click', () => {
            const images = zoom.getImages();
            const imageIndex = images.indexOf(zoom.getZoomedImage());
            const newIndex = imageIndex === 0 ? images.length - 1 : imageIndex - 1;
            zoom.change({ target: images[newIndex] });
          });
        });
      </script>

      <style>

      img {
        max-width: 100%;
        height: auto;
      }

      .container {
        width: 100%;
        max-width: 768px;
        margin: 48px auto;
        padding: 16px;
      }

      .template-wrapper {
        position: fixed;
        display: flex;
        flex-direction: column;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
      }

      .template-container {
        width: 100%;
        height: calc(100% - 64px);
        margin: 0 auto;
      }

      .template-header {
        display: flex;
        align-items: center;
        height: 64px;
        padding: 16px;
        justify-content: center;
      }
    </style>
    `,
  {
    notes: {
      markdown: `Change the zoomed image with custom template buttons`,
    },
  }
)
