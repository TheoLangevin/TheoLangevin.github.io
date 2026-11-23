import { ACHIEVEMENTS } from '../../config/achievements.js'
import { usePoule } from '../../state/usePoule.js'
import { FeatherIcon } from '../icons.jsx'

/** Every achievement: unlocked ones in colour, the others with their hint. */
export default function AchievementsPanel() {
  const unlocked = usePoule((state) => state.progression?.achievements)
  if (!unlocked) return null
  return (
    <section className="box achievements" aria-labelledby="achievements-title">
      <h2 id="achievements-title">
        Succès{' '}
        <small>
          {unlocked.length} / {ACHIEVEMENTS.length}
        </small>
      </h2>
      <ul>
        {ACHIEVEMENTS.map((achievement) => {
          const done = unlocked.includes(achievement.id)
          return (
            <li key={achievement.id} className={done ? 'achievement achievement--done' : 'achievement'}>
              <b>{achievement.label}</b>
              <small>{achievement.hint}</small>
              <span className="achievement__reward">
                <FeatherIcon size={12} /> {achievement.reward}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
