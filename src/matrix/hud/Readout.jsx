import { useEffect, useRef } from 'react'
import { rig } from '../state/rig.js'

const pad = (value) => {
  const text = Math.abs(value).toFixed(1).padStart(5, '0')
  return (value < 0 ? '-' : '+') + text
}

const HEADINGS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

/** Position, heading and frame rate, written straight into the DOM a few times a second. */
export default function Readout() {
  const position = useRef(null)
  const heading = useRef(null)
  const fps = useRef(null)

  useEffect(() => {
    const timer = setInterval(() => {
      // yaw 0 looks north (-z); turning right lowers yaw.
      const degrees = (((-rig.yaw * 180) / Math.PI) % 360 + 360) % 360
      position.current.textContent = `X ${pad(rig.x)}  Z ${pad(-rig.z)}  Y ${rig.y.toFixed(1)}`
      heading.current.textContent = `HDG ${String(Math.round(degrees)).padStart(3, '0')}° ${HEADINGS[Math.round(degrees / 45) % 8]}`
      fps.current.textContent = `${rig.fps} FPS`
    }, 120)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="hud__readout" aria-hidden="true">
      <span ref={position} />
      <span ref={heading} />
      <span ref={fps} />
    </div>
  )
}
