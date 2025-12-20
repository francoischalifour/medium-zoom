# Divi Integration

[Divi](https://www.elegantthemes.com/gallery/divi/) is a WordPress based Page Builder. See the following description how to integrate `meduim-zoom` into Divi. Note that you already must have Wordpress and Divi installed to proceed. You can select any other supported CDN or a local installation if required.

## Usage

* Add the following javascript code via `Divi/Team Options/Integration/Body`:
  ```
  <script src=https://unpkg.com/medium-zoom@1.1.0/dist/medium-zoom.min.js>
  </script>

  <script>
    jQuery(function($){
      const images = Array.from(document.querySelectorAll(".data-zoomable img"));
        images.forEach(img => {
          mediumZoom(img, {
          background: '#fff',
          margin: 10
          }
        );
      });
    });
  </script>
  ```
  Note that if you want to make _every_ image in your site zoomable, replace `.data-zoomable` with `.et_pb_image_wrap`. In that case, no custom CSS Class is needed, see below.

* Add the following custom css via `Divi/Team Options/General/Custom CSS`.  
  Note that the high value of `z-index` numbers are necessary as Divi already uses in some cases high numbers. Else, zoomed images may not show up:
  ```
  .medium-zoom-overlay { z-index: 99999; }
  .medium-zoom-image--opened { z-index: 100000;}
  ```

* Finally, for every image you want to make zoomable, go to:  
  `EditPage/select image container/Image Settings/Advanced/CSS Class`  
  and enter/add as value `data-zoomable`.
