import { useLayoutEffect, useRef } from 'react'
import { Color, Euler, Matrix4, Quaternion, Vector3 } from 'three'

const matrix = new Matrix4()
const position = new Vector3()
const quaternion = new Quaternion()
const scale = new Vector3()
const euler = new Euler()
const color = new Color()

/** Writes one instance's transform without allocating. */
export function writeInstance(mesh, index, x, y, z, rotX, rotY, rotZ, sx, sy = sx, sz = sx) {
  position.set(x, y, z)
  quaternion.setFromEuler(euler.set(rotX, rotY, rotZ))
  scale.set(sx, sy, sz)
  mesh.setMatrixAt(index, matrix.compose(position, quaternion, scale))
}

/** Sets an instance colour from a hex value, optionally scaled (above 1 glows). */
export function writeHexColor(mesh, index, hex, intensity = 1) {
  mesh.setColorAt(index, color.setHex(hex).multiplyScalar(intensity))
}

export function writeRgbColor(mesh, index, r, g, b) {
  mesh.setColorAt(index, color.setRGB(r, g, b))
}

/** Tells three.js how many instances to draw and that the buffers changed. */
export function commitInstances(mesh, count) {
  mesh.count = count
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

/**
 * Ref for an `<instancedMesh>` that starts empty. With `colors`, the colour
 * buffer is created up front so the material compiles with instance colours.
 */
export function useInstances({ colors = false } = {}) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (colors) mesh.setColorAt(0, color.set(0xffffff))
    mesh.count = 0
  }, [colors])
  return ref
}
