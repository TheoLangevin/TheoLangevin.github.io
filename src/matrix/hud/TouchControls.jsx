import { useRef, useState } from 'react'
import { input } from '../input/controls.js'
import { rig } from '../state/rig.js'
import { useMatrix } from '../state/useMatrix.js'

const STICK_RANGE = 54
const LOOK_SPEED = 2.4
const TAP = 10

/**
 * Touch controls: the left thumb moves (a stick appears where it lands), the
 * right thumb looks around; a tap on a structure opens it or travels to it.
 * Buttons: access, jump, directory and menu.
 */
export default function TouchControls() {
  const focusId = useMatrix((state) => state.focusId)
  const interact = useMatrix((state) => state.interact)
  const openDirectory = useMatrix((state) => state.openDirectory)
  const openPause = useMatrix((state) => state.openPause)
  const activate = useMatrix((state) => state.activate)
  const [stick, setStick] = useState(null)
  const touches = useRef(new Map())

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse') return
    const left = event.clientX < window.innerWidth * 0.45
    const touch = { kind: left ? 'move' : 'look', x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, moved: 0 }
    touches.current.set(event.pointerId, touch)
    if (left) setStick({ x: event.clientX, y: event.clientY, dx: 0, dy: 0 })
  }

  const onPointerMove = (event) => {
    const touch = touches.current.get(event.pointerId)
    if (!touch) return
    if (touch.kind === 'move') {
      let dx = event.clientX - touch.x
      let dy = event.clientY - touch.y
      const length = Math.hypot(dx, dy)
      if (length > STICK_RANGE) {
        dx *= STICK_RANGE / length
        dy *= STICK_RANGE / length
      }
      input.stickX = dx / STICK_RANGE
      input.stickY = dy / STICK_RANGE
      setStick({ x: touch.x, y: touch.y, dx, dy })
    } else {
      const dx = event.clientX - touch.lastX
      const dy = event.clientY - touch.lastY
      input.lookX += dx * LOOK_SPEED
      input.lookY += dy * LOOK_SPEED
      touch.moved += Math.abs(dx) + Math.abs(dy)
      touch.lastX = event.clientX
      touch.lastY = event.clientY
    }
  }

  const onPointerUp = (event) => {
    const touch = touches.current.get(event.pointerId)
    if (!touch) return
    touches.current.delete(event.pointerId)
    if (touch.kind === 'move') {
      input.stickX = input.stickY = 0
      setStick(null)
    } else if (touch.moved < TAP && event.type === 'pointerup') {
      const node = rig.pick?.(event.clientX, event.clientY)
      if (node) activate(node.id)
    }
  }

  return (
    <div className="touch">
      <div
        className="touch__zone"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {stick && (
          <div className="touch__stick" style={{ left: stick.x, top: stick.y }}>
            <div className="touch__knob" style={{ transform: `translate(${stick.dx}px, ${stick.dy}px)` }} />
          </div>
        )}
        {!stick && <p className="touch__hint">MOVE</p>}
      </div>

      <div className="touch__buttons">
        <button type="button" className="touch__button" onClick={openDirectory} aria-label="Directory">
          INDEX
        </button>
        <button type="button" className="touch__button" onClick={openPause} aria-label="Menu">
          MENU
        </button>
        <button
          type="button"
          className="touch__button touch__button--jump"
          onPointerDown={() => {
            input.jump = true
          }}
        >
          JUMP
        </button>
        <button
          type="button"
          className={`touch__button touch__button--access${focusId ? ' touch__button--ready' : ''}`}
          onClick={interact}
          disabled={!focusId}
        >
          ACCESS
        </button>
      </div>
    </div>
  )
}
