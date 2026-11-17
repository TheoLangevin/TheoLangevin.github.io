import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { useMatrix } from '../../state/useMatrix.js'

/**
 * Mounted once everything in its Suspense boundary has loaded (images
 * included): compiles the shaders up front, so entering does not stutter,
 * then tells the boot screen the world is ready.
 */
export default function Ready() {
  const { gl, scene, camera } = useThree()

  useEffect(() => {
    let frame = 0
    try {
      gl.compile(scene, camera)
    } catch {
      /* compiled lazily on the first frames instead */
    }
    frame = requestAnimationFrame(() => useMatrix.getState().setWorldStatus('ready'))
    return () => cancelAnimationFrame(frame)
  }, [gl, scene, camera])

  return null
}
