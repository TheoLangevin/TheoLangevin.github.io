/**
 * Raw input for the 3D world, written by DOM listeners and the touch controls
 * and read once per frame by the player controller.
 */
export const input = {
  keys: new Set(),
  /** Look movement accumulated since the last frame, in pixels. */
  lookX: 0,
  lookY: 0,
  /** Virtual stick, each axis in [-1, 1] (y grows downwards, like the screen). */
  stickX: 0,
  stickY: 0,
  /** Edge-triggered actions, cleared by whoever consumes them. */
  interact: false,
  jump: false,
}

// Physical key codes: KeyW is the Z key of an AZERTY keyboard, so ZQSD and
// WASD both work without asking which layout is in use.
const FORWARD = ['KeyW', 'ArrowUp']
const BACK = ['KeyS', 'ArrowDown']
const LEFT = ['KeyA', 'ArrowLeft']
const RIGHT = ['KeyD', 'ArrowRight']
const SPRINT = ['ShiftLeft', 'ShiftRight']

export const MOVE_KEYS = new Set([...FORWARD, ...BACK, ...LEFT, ...RIGHT, ...SPRINT])

const held = (codes) => codes.some((code) => input.keys.has(code))

/** Writes the wished movement into `out`: x to the right, z forward. */
export function readMove(out) {
  out.x = (held(RIGHT) ? 1 : 0) - (held(LEFT) ? 1 : 0) + input.stickX
  out.z = (held(FORWARD) ? 1 : 0) - (held(BACK) ? 1 : 0) - input.stickY
  out.sprint = held(SPRINT) || Math.hypot(input.stickX, input.stickY) > 0.92
  return out
}

export function clearInput() {
  input.keys.clear()
  input.lookX = input.lookY = 0
  input.stickX = input.stickY = 0
  input.interact = input.jump = false
}
