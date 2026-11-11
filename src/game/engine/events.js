/**
 * The engine never plays sounds or spawns particles itself: it queues events
 * and the presentation layer drains `world.events` after each step.
 */
export function emit(world, type, x = 0, y = 0, data) {
  world.events.push(data ? { type, x, y, ...data } : { type, x, y })
}
