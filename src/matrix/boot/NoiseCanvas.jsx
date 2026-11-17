import { useEffect, useRef } from 'react'
import { useMatrix } from '../state/useMatrix.js'

const WIDTH = 192
const HEIGHT = 128

/** Analogue video noise: a tiny canvas of random greys, stretched over the screen. */
export default function NoiseCanvas({ className }) {
  const ref = useRef(null)
  const reducedMotion = useMatrix((state) => state.reducedMotion)

  useEffect(() => {
    const context = ref.current.getContext('2d')
    const image = context.createImageData(WIDTH, HEIGHT)
    const pixels = new Uint32Array(image.data.buffer)
    const draw = () => {
      for (let i = 0; i < pixels.length; i++) {
        const grey = (Math.random() * 255) | 0
        pixels[i] = 0xff000000 | (grey << 16) | (grey << 8) | grey
      }
      context.putImageData(image, 0, 0)
    }
    draw()
    if (reducedMotion) return
    const timer = setInterval(draw, 66)
    return () => clearInterval(timer)
  }, [reducedMotion])

  return <canvas ref={ref} className={className} width={WIDTH} height={HEIGHT} aria-hidden="true" />
}
