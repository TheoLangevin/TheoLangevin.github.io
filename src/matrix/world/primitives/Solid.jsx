import { useMemo } from 'react'
import { EdgesGeometry } from 'three'
import { BODY } from './materials.js'

/**
 * The look of every structure: a dark body outlined by glowing edges.
 * `geometry` is created by the caller (and memoised there).
 */
export default function Solid({ geometry, lineMaterial, threshold = 20, children, ...props }) {
  const edges = useMemo(() => new EdgesGeometry(geometry, threshold), [geometry, threshold])
  return (
    <group {...props}>
      <mesh geometry={geometry} material={BODY} />
      <lineSegments geometry={edges} material={lineMaterial} />
      {children}
    </group>
  )
}
