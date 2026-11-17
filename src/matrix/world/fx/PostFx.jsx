import { useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import { Vector2 } from 'three'
import { rig } from '../../state/rig.js'

/**
 * Screen effects: the glow (bloom) that makes the green burn, plus on the best
 * preset a hint of colour fringing and film grain. The fringing jumps up for
 * a moment on teleports and sector changes, like a glitch in the signal.
 */
export default function PostFx({ mode, msaa }) {
  const full = mode === 'full'
  const aberration = useRef(null)
  const offset = useMemo(() => new Vector2(0.0006, 0.0004), [])

  useFrame(() => {
    const effect = aberration.current
    if (!effect) return
    const strength = 0.0006 + rig.glitch * rig.glitch * 0.012
    const jitter = rig.glitch > 0.05 ? (Math.random() - 0.5) * rig.glitch * 0.01 : 0
    effect.offset.set(strength + jitter, strength * 0.6)
  })

  return (
    <EffectComposer multisampling={msaa} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.55} luminanceSmoothing={0.3} radius={0.72} />
      <ChromaticAberration ref={aberration} offset={offset} radialModulation={false} modulationOffset={0} />
      {full ? <Noise premultiply opacity={0.35} /> : null}
      <Vignette offset={0.28} darkness={0.75} />
    </EffectComposer>
  )
}
