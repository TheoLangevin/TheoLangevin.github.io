import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { LEAGUES, RANK_REWARDS } from '../../config/seasons.js'
import { upgradeById } from '../../config/upgrades.js'
import { leagueProgress, seasonEnd, seasonId } from '../../domain/seasons.js'
import { useAccount } from '../../state/useAccount.js'
import { usePoule } from '../../state/usePoule.js'
import Dialog from '../account/Dialog.jsx'
import { count, multiplierLabel, tokens } from '../format.js'
import { CoinIcon, FeatherIcon } from '../icons.jsx'
import './ranking.css'

const BOARDS = [
  { id: 'season', label: 'Semaine' },
  { id: 'tokens', label: 'Jetons' },
  { id: 'xp', label: 'Niveau' },
  { id: 'bestMultiplier', label: 'Record' },
]

const valueOf = (kind, entry) => {
  if (kind === 'season') return `${count(entry.score)} XP`
  if (kind === 'tokens') return tokens(entry.tokens ?? 0)
  if (kind === 'xp') return `Niv. ${count(entry.level)}`
  return multiplierLabel(entry.bestMultiplier ?? 0)
}

function timeLeft(ms) {
  const hours = Math.max(0, Math.floor(ms / 3_600_000))
  const days = Math.floor(hours / 24)
  return days > 0 ? `${days} j ${hours % 24} h` : `${hours} h ${Math.floor((ms % 3_600_000) / 60_000)} min`
}

function LeagueBadge({ league, size = 44 }) {
  return (
    <span
      className="league"
      style={{ '--league': league?.color ?? '#9aa0a8', width: size, height: size }}
      aria-label={league ? `Ligue ${league.label}` : 'Pas encore classé'}
    >
      {league ? league.label.charAt(0) : '–'}
    </span>
  )
}

/** This week: time left, the player's league and how far to the next one. */
function SeasonCard({ onRewards }) {
  const week = usePoule((state) => state.week)
  const season = useAccount((state) => state.board.season)
  const standing = season?.standing ?? null
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  // This device's rounds, or the account's line if another device scored more.
  const score = Math.max(week?.xp ?? 0, season?.mine?.score ?? 0)
  const progress = leagueProgress(score)
  const id = seasonId(new Date(now))

  return (
    <section className="season card">
      <div className="season__head">
        <div>
          <small className="muted">Saison {id.slice(-2)}</small>
          <h2>Fin dans {timeLeft(seasonEnd(new Date(now)) - now)}</h2>
        </div>
        <button type="button" className="season__rewards" onClick={onRewards}>
          Récompenses
        </button>
      </div>
      <div className="season__me">
        <LeagueBadge league={progress.current} size={52} />
        <div className="season__progress">
          <b>
            {progress.current ? `Ligue ${progress.current.label}` : 'Pas encore classé'} · {count(score)} XP
          </b>
          <div
            className="bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress.ratio * 100)}
          >
            <span style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
          </div>
          <small className="muted">
            {progress.next ? `Encore ${count(progress.missing)} XP pour ${progress.next.label}` : 'Ligue maximale'}
            {standing ? ` · ${standing.rank}e sur ${standing.total}` : ''}
          </small>
        </div>
      </div>
    </section>
  )
}

function Title({ id }) {
  const label = upgradeById(id)?.label
  return label ? <span className="row__title">{label}</span> : null
}

function Podium({ kind, entries, uid, open }) {
  const order = [entries[1], entries[0], entries[2]]
  return (
    <ol className="podium" aria-label="Podium">
      {order.map((entry, index) =>
        entry ? (
          <li
            key={entry.uid}
            className={`podium__step podium__step--${[2, 1, 3][index]}${entry.uid === uid ? ' is-me' : ''}`}
          >
            <span className="podium__avatar">{entry.pseudo.charAt(0).toUpperCase()}</span>
            <b className="podium__name">{entry.pseudo}</b>
            <span className="podium__value">{valueOf(kind, entry)}</span>
            <span className="podium__block">{[2, 1, 3][index]}</span>
          </li>
        ) : (
          <li key={`empty-${index}`} className={`podium__step podium__step--${[2, 1, 3][index]} podium__step--empty`}>
            <span className="podium__block">{[2, 1, 3][index]}</span>
          </li>
        ),
      )}
    </ol>
  )
}

function RewardsSheet({ onClose }) {
  return (
    <Dialog title="Récompenses de la semaine" onClose={onClose}>
      <p>Chaque lundi, la saison se termine. Les récompenses se récupèrent à la connexion suivante.</p>
      <h3 className="sheet__h">Par ligue (XP gagnée dans la semaine)</h3>
      <ul className="rewards">
        {LEAGUES.map((league) => (
          <li key={league.id}>
            <span className="league" style={{ '--league': league.color, width: 32, height: 32 }}>
              {league.label.charAt(0)}
            </span>
            <span>
              <b>{league.label}</b>
              <small className="muted"> dès {count(league.min)} XP</small>
            </span>
            <span className="rewards__gain">
              <CoinIcon size={14} /> {tokens(league.reward.tokens)} <FeatherIcon size={13} /> {league.reward.feathers}
            </span>
          </li>
        ))}
      </ul>
      <h3 className="sheet__h">En plus, selon le rang</h3>
      <ul className="rewards">
        {RANK_REWARDS.map((tier) => (
          <li key={tier.id}>
            <b>{tier.label}</b>
            <span className="rewards__gain">
              <CoinIcon size={14} /> {tokens(tier.reward.tokens)} <FeatherIcon size={13} /> {tier.reward.feathers}
            </span>
            {tier.reward.items.length > 0 && (
              <small className="rewards__items">
                {tier.reward.items.map((id) => upgradeById(id).label).join(' · ')}
              </small>
            )}
          </li>
        ))}
      </ul>
      <p className="note">Seuls les joueurs connectés avec un pseudo sont classés.</p>
    </Dialog>
  )
}

export default function RankingScreen({ hidden, go }) {
  const [rewardsOpen, setRewardsOpen] = useState(false)
  const a = useAccount(
    useShallow((state) => ({
      status: state.status,
      uid: state.user?.uid,
      pseudo: state.pseudo,
      board: state.board,
      loadBoard: state.loadBoard,
      signIn: state.signIn,
      openDialog: state.openDialog,
      openPlayer: state.openPlayer,
    })),
  )
  const ready = a.status === 'signedIn' || a.status === 'signedOut'
  useEffect(() => {
    if (!hidden && ready) a.loadBoard()
    // Reload each time the screen is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, ready])

  const { kind, entries, loading, error, season } = a.board
  const mine = kind === 'season' ? season?.mine : null
  const inList = entries.some((entry) => entry.uid === a.uid)

  return (
    <main className="screen screen--ranking" hidden={hidden}>
      <h1 className="screen__title">Classement</h1>
      <SeasonCard onRewards={() => setRewardsOpen(true)} />

      {a.status === 'signedOut' && (
        <button type="button" className="cta card" onClick={a.signIn}>
          <b>Connectez-vous pour être classé</b>
          <span className="muted">Avec Google, en un geste. Votre progression vous suit sur tous vos appareils.</span>
        </button>
      )}
      {a.status === 'signedIn' && !a.pseudo && (
        <button type="button" className="cta card" onClick={() => a.openDialog('pseudo')}>
          <b>Choisissez un pseudo pour être classé</b>
          <span className="muted">Il remplace votre nom Google dans les classements.</span>
        </button>
      )}

      <div className="segmented ranking__tabs" role="tablist" aria-label="Classements">
        {BOARDS.map((board) => (
          <button
            key={board.id}
            type="button"
            role="tab"
            aria-selected={kind === board.id}
            onClick={() => a.loadBoard(board.id)}
          >
            {board.label}
          </button>
        ))}
      </div>

      {!ready && (
        <p className="note">{a.status === 'loading' ? 'Chargement…' : 'Classement indisponible pour le moment.'}</p>
      )}
      {ready && error && <p className="note">{error}</p>}
      {ready && !error && entries.length === 0 && (
        <p className="note">{loading ? 'Chargement…' : 'Personne pour l’instant. Soyez la première poule !'}</p>
      )}

      {entries.length > 0 && (
        <div aria-busy={loading}>
          <Podium kind={kind} entries={entries} uid={a.uid} open={a.openPlayer} />
          <ol className="board" start={4}>
            {entries.slice(3).map((entry, index) => (
              <li key={entry.uid} className={entry.uid === a.uid ? 'is-me' : undefined}>
                <button type="button" className="board__row" onClick={() => a.openPlayer(entry.uid, entry)}>
                  <span className="board__rank">{index + 4}</span>
                  <span className="board__who">
                    <b>{entry.pseudo}</b>
                    <Title id={entry.title} />
                  </span>
                  <span className="board__value">{valueOf(kind, entry)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {mine && !inList && season?.standing && (
        <ol className="board board--me" aria-label="Votre place">
          <li className="is-me">
            <button type="button" className="board__row" onClick={() => a.openPlayer(a.uid, mine)}>
              <span className="board__rank">{season.standing.rank}</span>
              <span className="board__who">
                <b>{mine.pseudo}</b>
                <small className="muted">Vous</small>
              </span>
              <span className="board__value">{valueOf('season', mine)}</span>
            </button>
          </li>
        </ol>
      )}

      <p className="note">
        Classements d’un jeu de démonstration : les scores sont calculés sur l’appareil de chaque joueur.
      </p>
      <button type="button" className="link-button" onClick={() => go('jouer')}>
        Jouer pour monter
      </button>
      {rewardsOpen && <RewardsSheet onClose={() => setRewardsOpen(false)} />}
    </main>
  )
}
