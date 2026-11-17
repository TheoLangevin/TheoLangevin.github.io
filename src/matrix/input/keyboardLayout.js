/**
 * Which letters sit on the movement keys: "ZQSD" on an AZERTY keyboard, "WASD"
 * on QWERTY. Only used for the on-screen hints; movement relies on key
 * positions and works on any layout.
 */
export async function detectMoveKeys() {
  try {
    const layout = await navigator.keyboard?.getLayoutMap?.()
    if (layout) {
      const letters = ['KeyW', 'KeyA', 'KeyS', 'KeyD'].map((code) => layout.get(code) ?? '')
      if (letters.every((letter) => letter.length === 1)) return letters.join('').toUpperCase()
    }
  } catch {
    /* API unavailable or blocked: fall back to a guess */
  }
  return /^fr\b/i.test(navigator.language ?? '') ? 'ZQSD' : 'WASD'
}
