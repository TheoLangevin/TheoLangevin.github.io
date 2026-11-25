import { useShallow } from 'zustand/react/shallow'
import { upgradeById } from '../../config/upgrades.js'
import { useAccount } from '../../state/useAccount.js'
import { count, multiplierLabel, tokens } from '../format.js'
import { divisionById } from '../../domain/leagues.js'
import Mannequin from '../road/Mannequin.jsx'
import Dialog from './Dialog.jsx'

const NOTHING = {}

/** Another player's public profile: their hen as dressed, and their records. */
export default function PlayerSheet() {
  const { player, me, close } = useAccount(
    useShallow((state) => ({ player: state.player, me: state.user?.uid, close: state.closePlayer })),
  )
  if (!player) return null
  const { profile, loading, error } = player
  const look = profile.look ?? NOTHING
  const worn = ['skin', 'hat', 'neck', 'plumage', 'trail', 'road', 'party']
    .map((slot) => upgradeById(look[slot]))
    .filter(Boolean)
  const figures = [
    ['Ligue', divisionById(profile.division)?.label ?? '—'],
    ['PL', profile.lp != null ? count(profile.lp) : '—'],
    ['Niveau', profile.level ? count(profile.level) : '—'],
    ['XP', profile.xp != null ? count(profile.xp) : '—'],
    ['Jetons', profile.tokens != null ? tokens(profile.tokens) : '—'],
    ['Record', profile.bestMultiplier ? multiplierLabel(profile.bestMultiplier) : '—'],
    ['Voies d’affilée', profile.bestLanes != null ? count(profile.bestLanes) : '—'],
  ]

  return (
    <Dialog title={profile.pseudo ?? 'Joueur'} onClose={close}>
      <div className="player" aria-busy={loading}>
        <Mannequin equipped={look} size="large" />
        {player.uid === me && <p className="player__me">C’est vous !</p>}
        {error && <p className="note">{error}</p>}
        <dl className="figures">
          {figures.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {worn.length > 0 && (
          <>
            <h3 className="sheet__h">Sa tenue</h3>
            <ul className="player__worn">
              {worn.map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          </>
        )}
        {!loading && worn.length === 0 && !error && <p className="note">Une poule nature, sans accessoire.</p>}
      </div>
    </Dialog>
  )
}
