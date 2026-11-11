/**
 * Raw input state, written by DOM listeners and the touch controls, and read
 * once per frame by the simulation.
 */
export const controls = {
  keys: new Set(),
  /** Virtual joystick vector, each axis in [-1, 1]. */
  joyX: 0,
  joyY: 0,
  /** Set when dash is pressed; cleared by the simulation once consumed. */
  dashQueued: false,
  /** Mouse position in normalised device coordinates. */
  pointerX: 0,
  pointerY: 0,
  /** True when the player aims with a mouse; touch players get auto-aim. */
  pointerAim: false,
}

// Physical key codes, so the layout (QWERTY, AZERTY...) does not matter.
const LEFT = ['KeyA', 'ArrowLeft']
const RIGHT = ['KeyD', 'ArrowRight']
const UP = ['KeyW', 'ArrowUp']
const DOWN = ['KeyS', 'ArrowDown']
const DASH = ['Space', 'ShiftLeft', 'ShiftRight']
const GAME_KEYS = new Set([...LEFT, ...RIGHT, ...UP, ...DOWN, ...DASH])

const pressed = (codes) => codes.some((code) => controls.keys.has(code))

/** Writes the movement vector (keyboard + joystick) into `out`. */
export function readMovement(out) {
  out.moveX = (pressed(RIGHT) ? 1 : 0) - (pressed(LEFT) ? 1 : 0) + controls.joyX
  out.moveY = (pressed(DOWN) ? 1 : 0) - (pressed(UP) ? 1 : 0) + controls.joyY
  return out
}

export function resetControls() {
  controls.keys.clear()
  controls.joyX = 0
  controls.joyY = 0
  controls.dashQueued = false
}

/** Starts listening to the keyboard and mouse. Returns a cleanup function. */
export function attachControls() {
  const onKeyDown = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || !GAME_KEYS.has(event.code)) return
    // Let Space activate a focused button instead of dashing.
    if (event.target instanceof Element && event.target.closest('button, a, input')) return
    event.preventDefault()
    if (DASH.includes(event.code) && !event.repeat) controls.dashQueued = true
    controls.keys.add(event.code)
  }
  const onKeyUp = (event) => controls.keys.delete(event.code)
  const onPointerMove = (event) => {
    if (event.pointerType !== 'mouse') return
    controls.pointerAim = true
    controls.pointerX = (event.clientX / window.innerWidth) * 2 - 1
    controls.pointerY = -(event.clientY / window.innerHeight) * 2 + 1
  }
  const onPointerDown = (event) => {
    if (event.pointerType !== 'mouse') controls.pointerAim = false
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('blur', resetControls)

  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('blur', resetControls)
    resetControls()
  }
}
