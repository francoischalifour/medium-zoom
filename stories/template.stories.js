import { storiesOf } from '@storybook/html'

storiesOf('template', module)
  .add(
    'Dropbox Paper style',
    () => `
      <template id="template-dropbox-paper">
        <div class="paper-wrapper">
          <section class="paper-main" data-zoom-close>
            <header class="paper-header">
              <svg class="paper-close" data-zoom-close viewBox="0 0 24 24">
                <path d="M8.817 7.403a1 1 0 0 0-1.414 1.414L10.586 12l-3.183 3.183a1 1 0 0 0 1.414 1.415L12 13.415l3.183 3.183a1 1 0 0 0 1.415-1.415L13.415 12l3.183-3.183a1 1 0 0 0-1.415-1.414L12 10.586 8.817 7.403z"
                  fill-rule="evenodd"></path>
              </svg>
            </header>
            <div class="paper-container" data-zoom-container></div>
          </section>
          <aside class="paper-sidebar">
            <header class="paper-sidebar__header">
              <textarea class="paper-sidebar__textarea" rows="1" placeholder="Write a caption"></textarea>
            </header>
            <section class="paper-sidebar__content">
              <textarea class="paper-sidebar__textarea paper-sidebar__textarea_comment" rows="1" placeholder="New comment"></textarea>
            </section>
          </aside>
        </div>
      </template>

      <img src="image-1.jpg">

      <script>
        const zoom = mediumZoom('img', {
          background: 'rgba(247, 249, 250, 0.97)',
          margin: 16,
          template: '#template-dropbox-paper',
          container: '[data-zoom-container]',
        });

        // You can start manipulating the DOM after the \`shown\` event has been triggered
        zoom.addEventListeners('shown', () => {
          const closeButton = document.querySelector('[data-zoom-close]');
          closeButton.addEventListener('click', zoom.hide);
        });

        // Block scroll on zoom
        zoom.addEventListeners('show', () => {
          document.body.style.overflow = 'hidden';
        });
        zoom.addEventListeners('hide', () => {
          document.body.style.overflow = '';
        });
      </script>

      <style>
        body {
          font-family: 'AtlasGrotesk-dmc', -apple-system, BlinkMacSystemFont, 'Segoe UI',
            Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          font-size: 20px;
          color: #212121;
          background-color: #fff;
        }

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

        .paper-wrapper {
          position: fixed;
          display: flex;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
        }

        .paper-container {
          width: 100%;
          height: calc(100% - 64px);
          margin: 0 auto;
        }

        .paper-header {
          display: flex;
          align-items: center;
          height: 64px;
          padding: 16px;
        }

        .paper-main {
          flex: 1;
          height: 100%;
        }

        .paper-close {
          width: 24px;
          cursor: pointer;
          fill: #637282;
        }

        .paper-sidebar {
          width: 290px;
          border-left: 1px solid #e6e8eb;
          background-color: #fff;
          padding: 32px 0 16px 0;
        }

        @media (max-width: 800px) {
          .paper-sidebar {
            display: none;
          }
        }

        .paper-sidebar__header,
        .paper-sidebar__content {
          padding: 16px;
        }

        .paper-sidebar__header {
          border-bottom: 1px solid #e6e8eb;
        }

        .paper-sidebar__textarea {
          outline: none;
          width: 100%;
          border: none;
          background: none;
          font: inherit;
          font-size: 0.9rem;
          color: #637282;
        }

        .paper-sidebar__textarea::placeholder {
          color: #c1c7cd;
        }

        .paper-sidebar__textarea_comment {
          width: 100%;
          padding: 16px;
          border-radius: 5px;
          border: 1px solid rgba(99, 114, 130, 0.4);
        }
      </style>
    `,
    {
      notes: `
        This is a template themed like Dropbox Paper.
      `,
    }
  )
  .add(
    'Facebook style',
    () => `
      <template id="template-facebook">
        <div class="facebook-wrapper">
          <svg class="facebook-close" data-zoom-close viewBox="0 0 24 24">
            <path d="M8.817 7.403a1 1 0 0 0-1.414 1.414L10.586 12l-3.183 3.183a1 1 0 0 0 1.414 1.415L12 13.415l3.183 3.183a1 1 0 0 0 1.415-1.415L13.415 12l3.183-3.183a1 1 0 0 0-1.415-1.414L12 10.586 8.817 7.403z"
            fill-rule="evenodd"></path>
          </svg>
          <section class="facebook-main" data-zoom-container></section>
          <aside class="facebook-sidebar"></aside>
        </div>
      </template>

      <article class="container">
        <img src="image-1.jpg">
      </article>

      <script>
        const zoom = mediumZoom('.container img', {
          background: 'rgba(0, 0, 0, 0.9)',
          template: '#template-facebook',
          container: '[data-zoom-container]',
        });

        // You can start manipulating the DOM after the \`shown\` event has been triggered
        zoom.addEventListeners('shown', () => {
          const closeButton = document.querySelector('[data-zoom-close]');
          closeButton.addEventListener('click', zoom.hide);
        });

        // Block scroll on zoom
        zoom.addEventListeners('show', () => {
          document.body.style.overflow = 'hidden';
        });

        zoom.addEventListeners('hide', () => {
          document.body.style.overflow = '';
        });
      </script>

      <style>
        body {
          font-family: 'AtlasGrotesk-dmc', -apple-system, BlinkMacSystemFont, 'Segoe UI',
            Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          font-size: 20px;
          color: #212121;
          background-color: #fff;
        }

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

        .facebook-wrapper {
          position: fixed;
          display: flex;
          top: 0;
          height: 520px;
          top: 0;
          bottom: 0;
          left: 4rem;
          right: 4rem;
          margin: auto;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
        }

        .facebook-main {
          flex: 1;
          height: 100%;
          background-color: #000;
        }

        .facebook-sidebar {
          width: 360px;
          background-color: #fff;
          padding: 32px 0 16px 0;
        }

        @media (max-width: 800px) {
          .facebook-sidebar {
            display: none;
          }
        }

        .facebook-close {
          position: fixed;
          top: 8px;
          right: 8px;
          width: 32px;
          cursor: pointer;
          fill: #ddd;
        }
      </style>
    `,
    {
      notes: `
        This is a template themed like Facebook.
      `,
    }
  )
