import { useCallback, useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { TIMING } from '../../config/timing.js'
import { FINISH_WIDTH, HEN_VIEW_ANCHOR, LANE_WIDTH, START_WIDTH } from '../../config/ui.js'
import { modeById } from '../../config/modes.js'
import { laneMultipliers } from '../../domain/multiplier.js'
import { usePoule } from '../../state/usePoule.js'
import Car from './Car.jsx'
import Confetti from './Confetti.jsx'
import Hen from './Hen.jsx'
import Lane from './Lane.jsx'
import Toast from './Toast.jsx'
import { useElementWidth } from './useElementWidth.js'
import { useHenLook } from './useHenLook.js'
import { useTraffic } from './useTraffic.js'
import './road.css'

const NO_CARS = []
const KILLER_CAR = { color: '#e8392c', duration: 0.6 }
const SHAKE = [0, -9, 8, -6, 4, -2, 0].map((x, index) => ({ transform: `translate(${x}px, ${index % 2 ? 3 : -2}px)` }))

const henX = (lane) => (lane === 0 ? START_WIDTH / 2 : START_WIDTH + (lane - 1) * LANE_WIDTH + LANE_WIDTH / 2)

/** The road seen from above: pavement, lanes, finish line, the hen and the traffic. */
export default function Road() {
  const { modeId, round, scene, busy, phase, crashId, twin, play } = usePoule(
    useShallow((state) => ({
      modeId: state.round?.modeId ?? state.modeId,
      round: state.round,
      scene: state.scene,
      busy: state.busy,
      phase: state.phase,
      crashId: state.fx?.type === 'crash' ? state.fx.id : null,
      twin: state.doubleNext,
      play: state.play,
    })),
  )
  const look = useHenLook()
  const mode = modeById(modeId)
  const multipliers = useMemo(() => laneMultipliers(mode), [mode])
  const [viewport, width] = useElementWidth()

  // Lanes behind the hen are closed by a barrier; traffic runs on the others.
  const crossedUpTo = scene.deadLane ? scene.deadLane - 1 : round ? round.lane : scene.lane
  const { cars, remove } = useTraffic({ firstLane: round ? scene.lane + 2 : crossedUpTo + 1, lastLane: mode.lanes })
  const carsByLane = useMemo(() => {
    const byLane = new Map()
    for (const car of cars) byLane.set(car.lane, [...(byLane.get(car.lane) ?? []), car])
    return byLane
  }, [cars])
  const onCarGone = useCallback((id) => remove(id), [remove])

  const total = START_WIDTH + mode.lanes * LANE_WIDTH + FINISH_WIDTH
  const x = henX(scene.lane)
  const offset = Math.max(0, Math.min(x - width * HEN_VIEW_ANCHOR, total - width))

  const laneState = (lane) => {
    if (lane === scene.deadLane) return 'dead'
    if (lane <= crossedUpTo) return 'crossed'
    if (round && !busy && lane === round.lane + 1) return 'next'
    return 'open'
  }

  // The road shakes when a car hits the hen.
  useEffect(() => {
    const element = viewport.current
    if (!crashId || !element?.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    element.animate(SHAKE, { duration: 420, easing: 'ease-out' })
  }, [crashId, viewport])

  // During a round, a tap anywhere on the road moves the hen: handy on a phone.
  const onRoadTap = round && !busy ? () => play() : undefined

  return (
    <div
      className={`road${onRoadTap ? ' road--tappable' : ''}`}
      data-road={look.road ?? undefined}
      ref={viewport}
      onClick={onRoadTap}
      aria-label={`Route de ${mode.lanes} voies, mode ${mode.label}`}
    >
      <div className="road__track" style={{ width: total, transform: `translateX(${-offset}px)` }}>
        <div className="road__pavement" style={{ width: START_WIDTH }} />
        {multipliers.map((multiplier, index) => (
          <Lane
            key={`${mode.id}-${index}`}
            multiplier={multiplier}
            state={laneState(index + 1)}
            cars={carsByLane.get(index + 1) ?? NO_CARS}
            skin={look.skin}
            onCarGone={onCarGone}
          />
        ))}
        <div className="road__finish" style={{ width: FINISH_WIDTH }}>
          Arrivée
        </div>
        {scene.threat && (
          <div className="road__threat" style={{ left: henX(scene.threat) - LANE_WIDTH / 2, width: LANE_WIDTH }}>
            <Car key={scene.hop} id={-1} {...KILLER_CAR} skin={look.skin} delay={TIMING.crashCarDelay / 1000} />
          </div>
        )}
        {twin && <Hen x={x - 30} hop={scene.hop} flat={Boolean(scene.deadLane)} look={look} twin />}
        <Hen x={x} hop={scene.hop} flat={Boolean(scene.deadLane)} look={look} />
      </div>
      {phase === 'loading' && <div className="road__loading">Ouverture de la base SQLite…</div>}
      <Confetti />
      <Toast />
    </div>
  )
}
