import { useEffect, useRef, useState } from 'react'
import { controls } from '../input/controls.js'
import { DashIcon } from './icons.jsx'
import './touch.css'

const STICK_RANGE = 56

/**
 * Touch controls: drag anywhere on the left side to steer (the stick appears
 * under the thumb), tap the button on the right to dash. Hidden with a mouse.
 */
export default function TouchControls() {
  const [stick, setStick] = useState(null)
  const origin = useRef(null)

  const release = () => {
    origin.current = null
    controls.joyX = 0
    controls.joyY = 0
    setStick(null)
  }

  useEffect(() => release, [])

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse') return
    origin.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    setStick({ x: event.clientX, y: event.clientY, dx: 0, dy: 0 })
  }

  const onPointerMove = (event) => {
    const start = origin.current
    if (!start || start.id !== event.pointerId) return
    let dx = event.clientX - start.x
    let dy = event.clientY - start.y
    const length = Math.hypot(dx, dy)
    if (length > STICK_RANGE) {
      dx *= STICK_RANGE / length
      dy *= STICK_RANGE / length
    }
    controls.joyX = dx / STICK_RANGE
    controls.joyY = dy / STICK_RANGE
    setStick({ x: start.x, y: start.y, dx, dy })
  }

  const onPointerUp = (event) => {
    if (origin.current?.id === event.pointerId) release()
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
          <div className="stick" style={{ left: stick.x, top: stick.y }}>
            <div className="stick__knob" style={{ transform: `translate(${stick.dx}px, ${stick.dy}px)` }} />
          </div>
        )}
      </div>
      <button
        type="button"
        className="touch__dash"
        aria-label="Dash"
        onPointerDown={() => {
          controls.dashQueued = true
        }}
      >
        <DashIcon />
      </button>
    </div>
  )
}
