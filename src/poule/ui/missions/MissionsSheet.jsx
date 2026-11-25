import { useShallow } from 'zustand/react/shallow'
import { usePoule } from '../../state/usePoule.js'
import Dialog from '../account/Dialog.jsx'
import { count, tokens } from '../format.js'
import { CoinIcon } from '../icons.jsx'

/** Whether something waits to be collected: the day's bonus or a finished mission. */
export const hasMissionReward = (state) =>
  Boolean(state.streak?.next) || state.missions.some((mission) => !mission.claimed && mission.progress >= mission.goal)

/** The day's comeback bonus and three missions. */
export default function MissionsSheet() {
  const s = usePoule(
    useShallow((state) => ({
      open: state.missionsOpen,
      missions: state.missions,
      streak: state.streak,
      openMissions: state.openMissions,
      claimMission: state.claimMission,
      claimStreak: state.claimStreak,
    })),
  )
  if (!s.open) return null
  const close = () => s.openMissions(false)
  const next = s.streak?.next
  return (
    <Dialog title="Missions du jour" onClose={close}>
      <section className="streak">
        <div className="streak__days" aria-label="Série de jours">
          {Array.from({ length: 7 }, (_, index) => {
            const days = next ? next.days : (s.streak?.days ?? 0)
            const done = index < (next ? days - 1 : days)
            const today = next && index === days - 1
            return <i key={index} className={done ? 'is-done' : today ? 'is-today' : undefined} />
          })}
        </div>
        {next ? (
          <button type="button" className="big big--buy" onClick={s.claimStreak}>
            Bonus du jour : {tokens(next.bonus)} jetons
            <small>Jour {count(next.days)} de suite</small>
          </button>
        ) : (
          <p className="note">
            Bonus récupéré · série de {count(s.streak?.days ?? 1)} jour{s.streak?.days > 1 ? 's' : ''}. Revenez demain !
          </p>
        )}
      </section>
      <ul className="missions">
        {s.missions.map((mission) => {
          const done = mission.progress >= mission.goal
          return (
            <li key={mission.id} className={mission.claimed ? 'is-claimed' : undefined}>
              <div>
                <b>{mission.label}</b>
                <span className="missions__bar">
                  <i style={{ width: `${(mission.progress / mission.goal) * 100}%` }} />
                </span>
                <small>
                  {count(mission.progress)} / {count(mission.goal)}
                </small>
              </div>
              {mission.claimed ? (
                <span className="missions__done">✓</span>
              ) : (
                <button type="button" disabled={!done} onClick={() => s.claimMission(mission.id)}>
                  <CoinIcon size={14} /> {tokens(mission.reward)}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      <p className="note">Nouvelles missions chaque jour à minuit UTC (1 h à Paris en hiver).</p>
    </Dialog>
  )
}
