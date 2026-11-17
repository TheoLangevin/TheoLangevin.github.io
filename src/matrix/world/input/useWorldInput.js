import { useEffect } from 'react'
import { input, MOVE_KEYS } from '../../input/controls.js'
import { capturePointer, isPointerLocked } from '../../input/pointerLock.js'
import { clearInput } from '../../input/controls.js'
import { rig } from '../../state/rig.js'
import { useMatrix } from '../../state/useMatrix.js'

const DRAG_THRESHOLD = 6
/** Browsers sometimes report one huge jump right after capturing the mouse: ignore it. */
const SETTLE_MS = 150
const SPIKE = 180

/**
 * Keyboard and mouse in the world.
 *
 * With the mouse captured (pointer lock), moving looks around and a click
 * interacts with what is in the crosshair. Without it, dragging looks around
 * and a click on a structure opens it (or travels to it when it is far away);
 * a click on empty space captures the mouse.
 */
export function useWorldInput() {
  useEffect(() => {
    const game = () => useMatrix.getState()
    const active = () => game().phase === 'world' && !game().overlay
    let press = null
    let settleUntil = 0

    const onKeyDown = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || !active()) return
      if (MOVE_KEYS.has(event.code)) {
        input.keys.add(event.code)
        if (event.code.startsWith('Arrow')) event.preventDefault()
        return
      }
      if (event.repeat) return
      switch (event.code) {
        case 'KeyE':
        case 'Enter':
          event.preventDefault()
          game().interact()
          break
        case 'Space':
          event.preventDefault()
          input.jump = true
          break
        case 'Tab':
          event.preventDefault()
          game().openDirectory()
          break
        case 'Escape':
          // With the mouse captured, the browser releases it and that opens the menu.
          if (!isPointerLocked()) game().openPause()
          break
        default:
      }
    }
    const onKeyUp = (event) => input.keys.delete(event.code)

    const onLockChange = () => {
      const locked = isPointerLocked()
      game().setLocked(locked)
      if (locked) settleUntil = performance.now() + SETTLE_MS
      if (!locked && active() && !game().leaving) game().openPause()
    }

    const onPointerDown = (event) => {
      if (event.target !== rig.canvas || event.pointerType !== 'mouse' || event.button !== 0) return
      press = { x: event.clientX, y: event.clientY, moved: 0 }
    }
    const onPointerMove = (event) => {
      if (event.pointerType !== 'mouse') return
      if (isPointerLocked()) {
        const spike = Math.abs(event.movementX) > SPIKE || Math.abs(event.movementY) > SPIKE
        if (spike || performance.now() < settleUntil) return
        input.lookX += event.movementX
        input.lookY += event.movementY
      } else if (press && active()) {
        // Drag to look, when the mouse is not captured.
        input.lookX += event.movementX * 1.2
        input.lookY += event.movementY * 1.2
        press.moved += Math.abs(event.movementX) + Math.abs(event.movementY)
      }
    }
    const onPointerUp = (event) => {
      if (!press || event.pointerType !== 'mouse') return
      const click = press.moved < DRAG_THRESHOLD
      press = null
      if (!click || !active()) return
      if (isPointerLocked()) return game().interact()
      const node = rig.pick?.(event.clientX, event.clientY)
      if (node) game().activate(node.id)
      else capturePointer()
    }

    const onBlur = () => clearInput()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('pointerlockchange', onLockChange)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('pointerlockchange', onLockChange)
    }
  }, [])
}
