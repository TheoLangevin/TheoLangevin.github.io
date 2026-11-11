import { Canvas } from '@react-three/fiber'
import { lazy, Suspense } from 'react'
import { PALETTE } from '../feedback/palette.js'
import { useGame } from '../state/useGame.js'
import Arena from './Arena.jsx'
import CameraRig from './CameraRig.jsx'
import Effects from './Effects.jsx'
import Enemies from './Enemies.jsx'
import Orbitals from './Orbitals.jsx'
import Pickups from './Pickups.jsx'
import PlayerShip from './PlayerShip.jsx'
import Projectiles from './Projectiles.jsx'
import Simulation from './Simulation.jsx'

// Post-processing is optional, so its code is only downloaded when Glow is on.
const PostFx = lazy(() => import('./PostFx.jsx'))

/** The whole 3D view. Nothing here re-renders during play: it all runs in `useFrame`. */
export default function GameCanvas() {
  const glow = useGame((state) => state.settings.glow)

  return (
    <Canvas
      className="game-canvas"
      flat
      dpr={[1, 1.75]}
      camera={{ fov: 50, near: 0.5, far: 260, position: [0, 30, 17] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[PALETTE.background]} />
      <fog attach="fog" args={[PALETTE.background, 50, 120]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[12, 30, 8]} intensity={1.8} />

      <Simulation />
      <CameraRig />
      <Arena />
      <Pickups />
      <Enemies />
      <PlayerShip />
      <Orbitals />
      <Projectiles />
      <Effects />
      {glow && (
        <Suspense fallback={null}>
          <PostFx />
        </Suspense>
      )}
    </Canvas>
  )
}
