import { useShallow } from 'zustand/react/shallow'
import { useAccount } from '../../state/useAccount.js'
import { usePoule } from '../../state/usePoule.js'
import Avatar from '../account/Avatar.jsx'
import { count, tokens } from '../format.js'
import { CoinIcon, FeatherIcon, UserIcon } from '../icons.jsx'

/** Level with its progress ring, feathers, tokens, and the player. */
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
        <span className="pill pill--feathers">
          <FeatherIcon size={16} />
          <b>{progression ? count(progression.feathers) : '…'}</b>
        </span>
      </div>

      <button type="button" className="topbar__me" onClick={() => go('profil')} aria-label="Mon profil">
        {user ? <Avatar user={user} size={36} /> : <UserIcon size={22} />}
        {user && <i className={`topbar__dot topbar__dot--${syncState}`} aria-hidden="true" />}
      </button>
    </header>
  )
}
