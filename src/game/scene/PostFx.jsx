import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'

/** Bloom makes everything bright glow; it is the optional "Glow" setting. */
export default function PostFx() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.7} luminanceSmoothing={0.2} />
      <Vignette offset={0.3} darkness={0.6} />
    </EffectComposer>
  )
}
