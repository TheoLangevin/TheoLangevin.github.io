import { useMemo } from 'react'
import { usePoule } from '../../state/usePoule.js'

const COLORS = ['#ffc21a', '#e8392c', '#2f7de1', '#1f9d55', '#ffffff', '#f08a24']

/** A burst of confetti over the road on every win, bigger for bigger wins. */
export default function Confetti() {
  const fx = usePoule((state) => state.fx)
  const burst = fx?.type === 'win' ? fx : null

  const pieces = useMemo(() => {
    if (!burst) return []
    const count = burst.multiplier >= 10 ? 70 : burst.multiplier >= 3 ? 45 : 26
    return Array.from({ length: count }, (_, index) => ({
      key: index,
      style: {
        '--x': `${Math.random() * 100}%`,
        '--drift': `${(Math.random() - 0.5) * 160}px`,
        '--spin': `${(Math.random() - 0.5) * 1080}deg`,
        '--delay': `${Math.random() * 0.25}s`,
        '--duration': `${1.1 + Math.random() * 0.9}s`,
        background: COLORS[index % COLORS.length],
      },
    }))
  }, [burst])

  if (!burst) return null
  return (
    <div key={burst.id} className="confetti" aria-hidden="true">
      {pieces.map((piece) => (
        <span key={piece.key} style={piece.style} />
      ))}
    </div>
  )
}
