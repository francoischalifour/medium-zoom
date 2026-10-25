# Playing a video after zooming a poster

Use Medium Zoom's lifecycle events to play a video over a zoomed poster.
See the [example](../examples/video) and its [JavaScript](../examples/video/src/index.js).

## Poster and playback

Use an uncropped poster with the same aspect ratio as the video to avoid a jump
when playback appears. The example includes a static frame and downloads the
video only when opened. A button around the poster supports Enter and Space.

1. On `open`, create a muted video with native `controls` and `playsInline`, then
   call `play()` during the user gesture. Keep it detached during the image animation.
2. On `opened`, measure `.medium-zoom-image--opened` with
   `getBoundingClientRect()`. Position the video over those bounds using
   `position: fixed` and a higher `z-index`.
3. Reveal the video when `loadeddata` supplies a frame. If `play()` rejects, show
   its poster and controls so the user can start playback manually.

The event target and `zoom.getZoomedImage()` return the original image. This
single-image example queries the animated clone after opening; events do not
expose a clone reference.

Muted playback and `playsInline` do not guarantee autoplay. Browser policies and
codec support still apply. If loading fails, the zoomed poster remains visible.

## Dismissal and cleanup

Click outside the video or press Escape to close it. Native controls handle
clicks on the video. Medium Zoom also closes on resize and scrolling beyond its
configured threshold.

On `close`, pause and remove the player, clear its source, and call `load()` to
stop loading it. On `closed`, restore focus to the poster button. Reopening creates
a new player and starts from the beginning. Closing during the opening animation
uses the same cleanup.
