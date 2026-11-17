/**
 * Entry to the 3D world, kept apart from it on purpose: this file must not
 * import three.js, so the boot screen stays light and the heavy 3D code is
 * fetched in the background while the old machine "boots".
 */

let pending = null

/**
 * Text drawn into the 3D scene uses the page's monospace font, so wait for it
 * (but never more than a few seconds: a fallback font is better than no world).
 */
function fontsReady() {
  if (!document.fonts?.load) return Promise.resolve()
  const fonts = Promise.all([
    document.fonts.load('700 64px "IBM Plex Mono"'),
    document.fonts.load('400 64px "IBM Plex Mono"'),
  ])
  const timeout = new Promise((resolve) => setTimeout(resolve, 4000))
  return Promise.race([fonts, timeout]).catch(() => {})
}

export const importWorld = () =>
  (pending ??= Promise.all([import('./World.jsx'), fontsReady()]).then(([module]) => module))

/** three.js needs WebGL 2. Checked before downloading anything. */
export function detectWebGL2() {
  try {
    const context = document.createElement('canvas').getContext('webgl2')
    if (!context) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}
