import { useShallow } from 'zustand/react/shallow'
import { useAccount } from '../../state/useAccount.js'
import { usePoule } from '../../state/usePoule.js'
import Avatar from '../account/Avatar.jsx'
import { tokens } from '../format.js'
import { CoinIcon, UserIcon } from '../icons.jsx'
import { hasMissionReward } from '../missions/MissionsSheet.jsx'

/** Level with its progress ring, tokens, and the player. */
export default function TopBar({ go }) {
  const { ready, balance, progression } = usePoule(
    useShallow((state) => ({
      ready: state.phase === 'ready',
      balance: state.balanceCents,
      progression: state.progression,
    })),
  )
  const { user, syncState } = useAccount(useShallow((state) => ({ user: state.user, syncState: state.sync.state })))
  const ratio = progression?.ratio ?? 0
  const reward = usePoule(hasMissionReward)
  const openMissions = usePoule((state) => state.openMissions)

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar__level"
        onClick={() => go('profil')}
        aria-label={`Niveau ${progression?.level ?? 1}, ${Math.round(ratio * 100)} % vers le suivant`}
        style={{ '--ratio': ratio }}
      >
        <span>{progression?.level ?? 1}</span>
      </button>

      <div className="topbar__wallet" aria-live="polite">
        <span className="pill pill--tokens">
          <CoinIcon size={18} />
          <b>{ready ? tokens(balance) : '…'}</b>
        </span>
      </div>

      <button
        type="button"
        className="topbar__missions"
        onClick={() => openMissions(true)}
        aria-label={reward ? 'Missions du jour : récompense à récupérer' : 'Missions du jour'}
      >
        🎯{reward && <i className="topbar__dot topbar__dot--reward" aria-hidden="true" />}
      </button>
      <button type="button" className="topbar__me" onClick={() => go('profil')} aria-label="Mon profil">
        {user ? <Avatar user={user} size={36} /> : <UserIcon size={22} />}
        {user && <i className={`topbar__dot topbar__dot--${syncState}`} aria-hidden="true" />}
      </button>
    </header>
  )
}
