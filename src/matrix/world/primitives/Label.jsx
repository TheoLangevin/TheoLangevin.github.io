import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, MeshBasicMaterial, Vector3 } from 'three'
import { PALETTE } from '../palette.js'
import { createTextTexture } from '../textures/textTexture.js'

const worldPosition = new Vector3()

/**
 * Text floating in the world, drawn once into a texture. Give it a `height`
 * or a `width` in metres; the other side follows the text's proportions.
 *
 * With `billboard`, it turns to face the camera (only around the vertical
 * axis): its parent group must not be rotated.
 *
 * The material's colour multiplies the text colour; the mesh is passed to
 * `ref`, so a parent can make the text brighter or dimmer each frame.
 */
export default function Label({ ref, lines, height, width, color = PALETTE.greenHot, align = 'center', billboard = false, ...props }) {
  const mesh = useRef(null)
  const key = JSON.stringify(lines) + align
  const { texture, aspect } = useMemo(() => createTextTexture(lines, { align }), [key])
  const material = useMemo(() => {
    const result = new MeshBasicMaterial({
      map: texture,
      color: color.clone(),
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    result.userData.base = color.clone()
    return result
  }, [texture, color])

  useEffect(
    () => () => {
      texture.dispose()
      material.dispose()
    },
    [texture, material],
  )

  useFrame(({ camera }) => {
    if (!billboard) return
    mesh.current.getWorldPosition(worldPosition)
    mesh.current.rotation.y = Math.atan2(camera.position.x - worldPosition.x, camera.position.z - worldPosition.z)
  })

  const planeHeight = height ?? width / aspect
  const planeWidth = width ?? height * aspect

  return (
    <mesh
      ref={(value) => {
        mesh.current = value
        if (typeof ref === 'function') ref(value)
        else if (ref) ref.current = value
      }}
      material={material}
      {...props}
    >
      <planeGeometry args={[planeWidth, planeHeight]} />
    </mesh>
  )
}

/** Splits a text into lines of at most `width` characters, at word boundaries. */
export function wrapText(text, width) {
  const lines = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    if (line && (line + ' ' + word).length > width) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  return lines
}
