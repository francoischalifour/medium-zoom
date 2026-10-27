export function docsOgImagePath(path: string) {
  return `/og/${path.slice(1, -1).replaceAll('/', '-')}.jpg`
}
