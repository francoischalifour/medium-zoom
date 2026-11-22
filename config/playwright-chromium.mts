/**
 * Runs the Chromium projects on the browser at `MEDIUM_ZOOM_CHROMIUM_PATH` when set, for
 * machines whose preinstalled Chromium does not match the Playwright version and cannot
 * download its own. Without it, Playwright uses the browser it installed.
 */
export const chromium = <Device extends object>(device: Device) => {
  const executablePath = process.env.MEDIUM_ZOOM_CHROMIUM_PATH
  return executablePath
    ? { ...device, launchOptions: { executablePath } }
    : device
}
