import { useEffect, useRef } from 'react'
import { NODES, SECTORS, WORLD_RADIUS } from '../content/world.js'
import { rig } from '../state/rig.js'

const SIZE = 132
const SCALE = (SIZE / 2 - 6) / WORLD_RADIUS
const COLORS = { green: '#00ff41', cyan: '#5cf6ff', white: '#eafff0' }
const SECTOR_COLOR = Object.fromEntries(SECTORS.map((sector) => [sector.id, COLORS[sector.accent]]))

/** A radar of the world, north up: sectors, nodes, and the visitor's position and heading. */
export default function Minimap() {
  const canvas = useRef(null)

  useEffect(() => {
    const context = canvas.current.getContext('2d')
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.current.width = canvas.current.height = SIZE * ratio
    context.scale(ratio, ratio)
    const toMap = (x, z) => [SIZE / 2 + x * SCALE, SIZE / 2 + z * SCALE]
    let frame = 0
    let last = 0

    const draw = (now) => {
      frame = requestAnimationFrame(draw)
      if (now - last < 66) return
      last = now
      context.clearRect(0, 0, SIZE, SIZE)

      // Edge of the world, and a sweeping radar line.
      context.strokeStyle = 'rgba(92, 246, 255, 0.45)'
      context.lineWidth = 1
      context.beginPath()
      context.arc(SIZE / 2, SIZE / 2, WORLD_RADIUS * SCALE, 0, Math.PI * 2)
      context.stroke()
      const sweep = (now / 1000) * 1.4
      context.strokeStyle = 'rgba(0, 255, 65, 0.25)'
      context.beginPath()
      context.moveTo(SIZE / 2, SIZE / 2)
      context.lineTo(SIZE / 2 + Math.cos(sweep) * SIZE * 0.47, SIZE / 2 + Math.sin(sweep) * SIZE * 0.47)
      context.stroke()

      for (const sector of SECTORS) {
        const [x, y] = toMap(...sector.at)
        context.strokeStyle = SECTOR_COLOR[sector.id] + '55'
        context.beginPath()
        context.arc(x, y, sector.radius * SCALE, 0, Math.PI * 2)
        context.stroke()
      }
      for (const node of NODES) {
        const [x, y] = toMap(...node.at)
        context.fillStyle = node.id === rig.focusId ? '#ffffff' : SECTOR_COLOR[node.sector]
        context.fillRect(x - 1.5, y - 1.5, 3, 3)
      }

      // The visitor: an arrow pointing where they look.
      const [px, py] = toMap(rig.x, rig.z)
      context.save()
      context.translate(px, py)
      context.rotate(-rig.yaw)
      context.fillStyle = '#ffffff'
      context.shadowColor = '#00ff41'
      context.shadowBlur = 6
      context.beginPath()
      context.moveTo(0, -6)
      context.lineTo(4, 4)
      context.lineTo(0, 2)
      context.lineTo(-4, 4)
      context.closePath()
      context.fill()
      context.restore()
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [])

  return <canvas ref={canvas} className="hud__map" style={{ width: SIZE, height: SIZE }} aria-hidden="true" />
}
