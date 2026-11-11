/**
 * Mutable, non-reactive handle on the current run.
 *
 * The world changes 60 times a second, so it lives outside React: scene
 * components read it inside `useFrame`, and only the small HUD snapshot goes
 * through the store.
 */
export const runtime = {
  /** @type {ReturnType<typeof import('../engine/createWorld.js').createWorld> | null} */
  world: null,
}
