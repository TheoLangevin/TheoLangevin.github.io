/**
 * Where the game runs. In the Android app (Capacitor) the native bridge puts
 * `Capacitor` on the window; on the web it is absent. Plugins are reached
 * through the bridge, so the web build needs no Capacitor package.
 */
export const isNativeApp = () => Boolean(globalThis.Capacitor?.isNativePlatform?.())

/**
 * A native plugin by name, or null outside the app. Without @capacitor/core
 * in the page, the bridge may lack registerPlugin: calls then go straight
 * through its nativePromise, which every Capacitor bridge has.
 */
export function nativePlugin(name) {
  if (!isNativeApp()) return null
  const cap = globalThis.Capacitor
  if (typeof cap.registerPlugin === 'function') return cap.registerPlugin(name)
  if (cap.Plugins?.[name]) return cap.Plugins[name]
  return new Proxy({}, { get: (_, method) => (options = {}) => cap.nativePromise(name, method, options) })
}
