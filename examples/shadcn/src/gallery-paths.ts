declare const __MEDIUM_ZOOM_GALLERY_BASE__: string

// The managed site uses shared root assets. Standalone builds preserve Vite's base.
export const galleryAssetBase =
  typeof __MEDIUM_ZOOM_GALLERY_BASE__ === 'undefined' ? '/assets/' : __MEDIUM_ZOOM_GALLERY_BASE__
