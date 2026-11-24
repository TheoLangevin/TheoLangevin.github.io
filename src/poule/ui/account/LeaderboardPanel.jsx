import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAccount } from '../../state/useAccount.js'
import { count, multiplierLabel } from '../format.js'

const TABS = [
  { by: 'xp', label: 'Niveau' },
  { by: 'bestMultiplier', label: 'Meilleur multiplicateur' },
]

/** The top 20 players, by level or by best multiplier. */
export default function LeaderboardPanel() {
  const { status, uid, pseudo, board, load, signIn, openDialog } = useAccount(
    useShallow((state) => ({
      status: state.status,
      uid: state.user?.uid,
      pseudo: state.pseudo,
      board: state.leaderboard,
      load: state.loadLeaderboard,
      signIn: state.signIn,
      openDialog: state.openDialog,
    })),
  )
  const ready = status === 'signedIn' || status === 'signedOut'

  useEffect(() => {
    if (ready) load('xp')
  }, [ready, load])

  if (!ready) return null

  return (
    <section className="box leaderboard" aria-labelledby="leaderboard-title">
      <div className="leaderboard__head">
        <h2 id="leaderboard-title">Classement</h2>
        <button type="button" className="link-button" onClick={() => load(board.by)} disabled={board.loading}>
          Actualiser
        </button>
      </div>
      <div className="shop__tabs" role="tablist" aria-label="Trier par">
        {TABS.map((tab) => (
          <button
            key={tab.by}
            type="button"
            role="tab"
            aria-selected={board.by === tab.by}
            onClick={() => load(tab.by)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {board.error && <p className="box__note">{board.error}</p>}
      {!board.error && board.entries.length === 0 && (
        <p className="box__note">
          {board.loading ? 'Chargement…' : 'Personne pour l’instant. Soyez la première poule !'}
        </p>
      )}
      {board.entries.length > 0 && (
        <ol className="leaderboard__list" aria-busy={board.loading}>
          {board.entries.map((entry, index) => (
            <li key={entry.uid} className={entry.uid === uid ? 'leaderboard__me' : undefined}>
              <span className="leaderboard__rank">{index + 1}</span>
              <span className="leaderboard__pseudo">{entry.pseudo}</span>
              <span className="leaderboard__value">
                {board.by === 'xp'
                  ? `Niv. ${count(entry.level)} · ${count(entry.xp)} XP`
                  : multiplierLabel(entry.bestMultiplier)}
              </span>
            </li>
          ))}
        </ol>
      )}

      {status === 'signedOut' && (
        <button type="button" className="leaderboard__cta" onClick={signIn}>
          Se connecter pour y figurer
        </button>
      )}
      {status === 'signedIn' && !pseudo && (
        <button type="button" className="leaderboard__cta" onClick={() => openDialog('pseudo')}>
          Choisir un pseudo pour y figurer
        </button>
      )}
      <p className="box__note">
        Classement d’un jeu de démonstration : les scores sont calculés sur l’appareil du joueur.
      </p>
    </section>
  )
}
