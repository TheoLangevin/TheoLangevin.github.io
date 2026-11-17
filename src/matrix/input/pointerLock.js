import { rig } from '../state/rig.js'

/** Mouse-look by pointer lock only makes sense with a real mouse. */
export const canLockPointer = () =>
  typeof document !== 'undefined' &&
  'pointerLockElement' in document &&
  window.matchMedia('(pointer: fine)').matches

export const isPointerLocked = () => rig.canvas !== null && document.pointerLockElement === rig.canvas

/**
 * Captures the mouse for looking around. Must be called from a user gesture;
 * if the browser refuses, dragging on the scene still turns the view.
 */
export function capturePointer() {
  const canvas = rig.canvas
  if (!canvas || !canLockPointer() || isPointerLocked()) return
  try {
    canvas.requestPointerLock()?.catch?.(() => {})
  } catch {
    /* refused: drag-to-look remains available */
  }
}

export function releasePointer() {
  if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock()
}
