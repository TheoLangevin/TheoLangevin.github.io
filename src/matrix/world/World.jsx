import { Canvas } from '@react-three/fiber'
import { lazy, Suspense } from 'react'
import { FOG_DENSITY, prepareShared } from './shared.js'
import { rig } from '../state/rig.js'
import { useMatrix } from '../state/useMatrix.js'
import CodeRain from './environment/CodeRain.jsx'
import DataStreams from './environment/DataStreams.jsx'
import DataTowers from './environment/DataTowers.jsx'
import Firewall from './environment/Firewall.jsx'
import Floor from './environment/Floor.jsx'
import Mist from './environment/Mist.jsx'
import Motes from './environment/Motes.jsx'
import SkyRain from './environment/SkyRain.jsx'
import AdaptiveQuality from './fx/AdaptiveQuality.jsx'
import Ready from './fx/Ready.jsx'
import { useWorldInput } from './input/useWorldInput.js'
import Focus from './interaction/Focus.jsx'
import { pickNode } from './interaction/pick.js'
import PlayerController from './player/PlayerController.jsx'
import { QUALITY } from './quality.js'
import Structures from './structures/Structures.jsx'
import './world.css'

// Screen effects are only downloaded when the quality preset uses them.
const PostFx = lazy(() => import('./fx/PostFx.jsx'))

prepareShared()
rig.pick = pickNode

function onCreated({ gl, camera }) {
  rig.canvas = gl.domElement
  rig.camera = camera
  gl.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    const game = useMatrix.getState()
    if (game.phase === 'boot') game.setWorldStatus('failed')
    else game.setSignalLost(true)
  })
}

/**
 * The 3D world. It is mounted (and its shaders compiled) under the boot
 * screen, so that crossing over is instant.
 */
export default function World() {
  const quality = useMatrix((state) => state.quality)
  const asleep = useMatrix((state) => state.phase === 'boot')
  const preset = QUALITY[quality]
  useWorldInput()

  return (
    <Canvas
      className="world"
      flat
      frameloop={asleep ? 'demand' : 'always'}
      dpr={preset.dpr()}
      camera={{ fov: 72, near: 0.05, far: 420, position: [0, 1.7, 18] }}
      gl={{ antialias: !preset.post, powerPreference: 'high-performance', stencil: false }}
      onCreated={onCreated}
    >
      <color attach="background" args={['#000000']} />
      <fogExp2 attach="fog" args={['#000703', FOG_DENSITY]} />

      <PlayerController />
      <Focus />
      <AdaptiveQuality />

      <SkyRain />
      <DataTowers />
      <Floor />
      <DataStreams />
      <Firewall />
      <Mist />
      <CodeRain amount={preset.rain} />
      <Motes amount={preset.motes} />

      <Suspense fallback={null}>
        <Structures />
        <Ready />
      </Suspense>

      {preset.post && (
        <Suspense fallback={null}>
          <PostFx mode={preset.post} msaa={preset.msaa} />
        </Suspense>
      )}
    </Canvas>
  )
}
