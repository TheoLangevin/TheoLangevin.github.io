/**
 * Where the game runs. In the Android app (Capacitor) the native bridge puts
 * `Capacitor` on the window; on the web it is absent. Plugins are reached
 * through the bridge, so the web build needs no Capacitor package.
 */
export const isNativeApp = () => Boolean(globalThis.Capacitor?.isNativePlatform?.())

/** A native plugin by name, or null outside the app. */
export const nativePlugin = (name) => (isNativeApp() ? globalThis.Capacitor.registerPlugin(name) : null)
