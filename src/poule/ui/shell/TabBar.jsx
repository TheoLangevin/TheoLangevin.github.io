import { useAccount } from '../../state/useAccount.js'
import { usePoule } from '../../state/usePoule.js'
import { BagIcon, PlayIcon, TrophyIcon, UserIcon } from '../icons.jsx'

const TABS = [
  { id: 'jouer', label: 'Jouer', Icon: PlayIcon },
  { id: 'boutique', label: 'Boutique', Icon: BagIcon },
  { id: 'classement', label: 'Classement', Icon: TrophyIcon },
  { id: 'profil', label: 'Profil', Icon: UserIcon },
]

/** The four screens, at thumb height. A dot flags a reward waiting. */
export default function TabBar({ route, go }) {
  const reward = useAccount((state) => Boolean(state.pendingReward))
  const inRound = usePoule((state) => Boolean(state.round))
  const badges = { classement: reward, jouer: inRound && route !== 'jouer' }

  return (
    <nav className="tabbar" aria-label="Écrans">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className="tabbar__tab"
          aria-current={route === id ? 'page' : undefined}
          onClick={() => go(id)}
        >
          <span className="tabbar__icon">
            <Icon />
            {badges[id] && <i className="tabbar__badge" aria-label="nouveau" />}
          </span>
          <span className="tabbar__label">{label}</span>
        </button>
      ))}
    </nav>
  )
}
