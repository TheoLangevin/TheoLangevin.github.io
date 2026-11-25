import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { DAILY_BET, DAILY_REWARDS, TOURNAMENT_REWARD_FACTOR } from '../../config/daily.js'
import { CURRENT_SEASON, GATES, RANK_BONUS, RANK_REWARDS, TIERS } from '../../config/seasons.js'
import { upgradeById } from '../../config/upgrades.js'
import { DIVISIONS, divisionById, divisionReward, leagueProgress, weekDelta } from '../../domain/leagues.js'
import { seasonEnd, seasonId } from '../../domain/seasons.js'
import { useAccount } from '../../state/useAccount.js'
import { usePoule } from '../../state/usePoule.js'
import Dialog from '../account/Dialog.jsx'
import { count, multiplierLabel, tokens } from '../format.js'
import { CoinIcon } from '../icons.jsx'
import { DuelsCard } from '../duels/Duels.jsx'
import { LiveFeed, TeamsPanel } from '../social/Social.jsx'
import LeagueBadge from '../league/LeagueBadge.jsx'
import './ranking.css'

/** "2026-11-25" → "25/11". */
const dayLabel = (id) => `${id.slice(8, 10)}/${id.slice(5, 7)}`

const BOARDS = [
  { id: 'season', label: 'Aujourd’hui' },
  { id: 'daily', label: 'Défi du jour' },
  { id: 'teams', label: 'Poulaillers' },
  { id: 'lp', label: 'Ligues' },
  { id: 'tokens', label: 'Jetons' },
  { id: 'xp', label: 'Niveau' },
  { id: 'bestMultiplier', label: 'Record' },
]

const valueOf = (kind, entry) => {
  if (kind === 'season') return `${count(entry.score)} XP`
  if (kind === 'daily') return entry.best ? multiplierLabel(entry.best) : 'Écrasée'
  if (kind === 'lp') return `${count(entry.lp ?? 0)} PL`
  if (kind === 'tokens') return tokens(entry.tokens ?? 0)
  if (kind === 'xp') return `Niv. ${count(entry.level)}`
  return multiplierLabel(entry.bestMultiplier ?? 0)
}

const signed = (value) => (value > 0 ? `+${count(value)}` : value < 0 ? `−${count(-value)}` : '0')

function timeLeft(ms) {
  const hours = Math.max(0, Math.floor(ms / 3_600_000))
  const days = Math.floor(hours / 24)
  return days > 0 ? `${days} j ${hours % 24} h` : `${hours} h ${Math.floor((ms % 3_600_000) / 60_000)} min`
}

/** This week and the player's league: division, PL, what the week would bring, the rival to overtake. */
function SeasonCard({ onRewards, openPlayer }) {
  const { week, league } = usePoule(useShallow((state) => ({ week: state.week, league: state.league })))
  const season = useAccount((state) => state.board.season)
  const signedIn = useAccount((state) => state.status === 'signedIn' && Boolean(state.pseudo))
  const standing = season?.standing ?? null
  const rival = season?.rival ?? null
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(timer)
  }, [])
  if (!league) return null
  // This device's rounds, or the account's line if another device scored more.
  const score = Math.max(week?.xp ?? 0, season?.mine?.score ?? 0)
  const progress = leagueProgress(league)
  const projected = weekDelta({ lp: league.lp, score, rank: standing?.rank, total: standing?.total })
  const id = seasonId(new Date(now))

  return (
    <section className="season card">
      <div className="season__head">
        <div>
          <small className="muted">
            {CURRENT_SEASON.label} · ligue du {dayLabel(id)}
          </small>
          <h2>Fin dans {timeLeft(seasonEnd(new Date(now)) - now)}</h2>
        </div>
        <button type="button" className="season__rewards" onClick={onRewards}>
          Règles
        </button>
      </div>
      <div className="season__me">
        <LeagueBadge division={progress.current} size={56} />
        <div className="season__progress">
          <div className="season__lp">
            <b>{progress.current.label}</b>
            <small>{count(league.lp)} PL</small>
          </div>
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
            {progress.next ? `Encore ${count(progress.missing)} PL pour ${progress.next.label}` : 'Sommet des ligues'}
          </small>
          {progress.blocked && <small className="season__lock">🔒 {progress.next.label} : {progress.blocked.toLowerCase()}</small>}
        </div>
      </div>
      <dl className="season__week">
        <div>
          <dt>XP aujourd’hui</dt>
          <dd>{count(score)}</dd>
        </div>
        <div>
          <dt>Rang</dt>
          <dd>{standing ? `${standing.rank}e / ${standing.total}` : '—'}</dd>
        </div>
        <div>
          <dt>Si ça s’arrêtait là</dt>
          <dd className={projected.delta >= 0 ? 'gain--up' : 'gain--down'}>{signed(projected.delta)} PL</dd>
        </div>
      </dl>
      {signedIn && rival && (
        <button type="button" className="rival" onClick={() => openPlayer(rival.uid, rival)}>
          <span aria-hidden="true">🎯</span>
          <span>
            À dépasser : <b>{rival.pseudo}</b>, {count(rival.score - score + 1)} XP de plus et vous passez devant.
          </span>
        </button>
      )}
      {signedIn && standing?.rank === 1 && <p className="rival">👑 Vous menez la journée. Tenez bon jusqu’à minuit (UTC) !</p>}
    </section>
  )
}

/** Today's challenge: mode, tries left, best, and a way into it. */
function DailyCard({ go }) {
  const { daily, setChallenge, inRound } = usePoule(
    useShallow((state) => ({ daily: state.daily, setChallenge: state.setChallenge, inRound: Boolean(state.round) })),
  )
  const board = useAccount((state) => state.board)
  if (!daily) return null
  const standing = board.kind === 'daily' ? board.daily?.standing : null
  return (
    <section className="daily-card card">
      <h2>
        {daily.tournament ? '🏆 Tournoi du week-end' : 'Défi du jour'} · {daily.mode.label}
      </h2>
      {daily.tournament ? (
        <p>
          Le week-end, le défi devient un tournoi : {daily.max} essais, une mise fixe de {tokens(DAILY_BET)} jetons, et{' '}
          <b>les mêmes routes pour tout le monde</b> (l’essai 1 est la même route pour tous, l’essai 2 aussi…). Récompenses
          ×{TOURNAMENT_REWARD_FACTOR}, et le titre « Reine du tournoi » pour la 1re place.
        </p>
      ) : (
        <p>
          Mêmes règles pour tous aujourd’hui : ce mode, une mise fixe de {tokens(DAILY_BET)} jetons, {daily.max} essais. Le
          meilleur multiplicateur encaissé compte. Les meilleurs sont payés demain. Le week-end : tournoi !
        </p>
      )}
      <p>
        <b>{daily.left}</b> essai{daily.left > 1 ? 's' : ''} restant{daily.left > 1 ? 's' : ''} · meilleur :{' '}
        <b>{daily.best ? multiplierLabel(daily.best) : '—'}</b>
        {standing ? ` · ${standing.rank}e sur ${standing.total}` : ''}
      </p>
      <button
        type="button"
        className="big big--play"
        disabled={daily.left === 0 || inRound}
        onClick={() => {
          setChallenge(true)
          go('jouer')
        }}
      >
        {daily.left ? 'Relever le défi' : 'Revenez demain'}
      </button>
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
            <button
              type="button"
              className="podium__who"
              onClick={() => open(entry.uid, entry)}
              aria-label={`Profil de ${entry.pseudo}`}
            >
              <span className="podium__avatar">{entry.pseudo.charAt(0).toUpperCase()}</span>
              <b className="podium__name">{entry.pseudo}</b>
              <span className="podium__value">{valueOf(kind, entry)}</span>
            </button>
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
  const league = usePoule((state) => state.league)
  return (
    <Dialog title="Ligues et récompenses" onClose={onClose}>
      <p>
        Chaque jour à minuit (heure UTC), la journée est réglée : vos points de ligue (PL) montent ou descendent, et vous êtes payé selon
        votre division et votre rang. À récupérer à la connexion suivante.
      </p>
      <h3 className="sheet__h">Points de la journée</h3>
      <ul className="rewards">
        <li>
          <b>Votre XP</b>
          <span className="rewards__gain">6 × √XP (max 150)</span>
        </li>
        {RANK_BONUS.map((tier) => (
          <li key={tier.top ?? tier.share}>
            <b>{tier.top ? (tier.top === 1 ? '1re place' : `Top ${tier.top}`) : `Top ${tier.share * 100} %`}</b>
            <span className="rewards__gain">+{tier.lp} PL</span>
          </li>
        ))}
        <li>
          <b>Entretien de la ligue</b>
          <span className="rewards__gain">−0 à −90 PL</span>
        </li>
        <li>
          <b>Jour sans jouer</b>
          <span className="rewards__gain">−entretien (min −10), 7 derniers jours seulement</span>
        </li>
      </ul>
      <h3 className="sheet__h">Ligues</h3>
      <ul className="rewards">
        {TIERS.map((tier) => {
          const first = DIVISIONS.find((entry) => entry.tier.id === tier.id)
          const last = DIVISIONS.findLast((entry) => entry.tier.id === tier.id)
          return (
            <li key={tier.id}>
              <LeagueBadge division={first} size={32} />
              <span>
                <b>{tier.label}</b>
                <small className="muted">
                  {' '}
                  dès {count(first.min)} PL · entretien {tier.upkeep}
                  {tier.gate ? ` · ${GATES[tier.gate].toLowerCase()}` : ''}
                </small>
              </span>
              <span className="rewards__gain">
                <CoinIcon size={14} /> {tokens(divisionReward(first))}
                {last !== first ? `–${tokens(divisionReward(last))}` : ''}
              </span>
            </li>
          )
        })}
      </ul>
      <h3 className="sheet__h">En plus, selon le rang</h3>
      <ul className="rewards">
        {RANK_REWARDS.map((tier) => (
          <li key={tier.id}>
            <b>{tier.label}</b>
            <span className="rewards__gain">
              <CoinIcon size={14} /> {tokens(tier.reward.tokens)}
            </span>
            {tier.reward.items.length > 0 && (
              <small className="rewards__items">
                {tier.reward.items.map((id) => upgradeById(id).label).join(' · ')}
              </small>
            )}
          </li>
        ))}
      </ul>
      <h3 className="sheet__h">Défi du jour (×{TOURNAMENT_REWARD_FACTOR} en tournoi le week-end)</h3>
      <ul className="rewards">
        {DAILY_REWARDS.map((tier) => (
          <li key={tier.id}>
            <b>{tier.label}</b>
            <span className="rewards__gain">
              <CoinIcon size={14} /> {tokens(tier.tokens)}
            </span>
          </li>
        ))}
      </ul>
      {league?.history.length > 0 && (
        <>
          <h3 className="sheet__h">Vos derniers jours</h3>
          <ul className="history-lp">
            {[...league.history].reverse().map((line) => (
              <li key={line.season}>
                <small className="muted">{dayLabel(line.season)}</small>
                <span>
                  {count(line.score)} XP{line.rank ? ` · ${line.rank}e/${line.total}` : ''}
                </span>
                <b className={line.delta >= 0 ? 'gain--up' : 'gain--down'}>{signed(line.delta)} PL</b>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="note">Seuls les joueurs connectés avec un pseudo sont classés.</p>
    </Dialog>
  )
}

export default function RankingScreen({ hidden, go }) {
  const [rewardsOpen, setRewardsOpen] = useState(false)
  const [tab, setTab] = useState(null)
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
      loadDuels: state.loadDuels,
    })),
  )
  const ready = a.status === 'signedIn' || a.status === 'signedOut'
  useEffect(() => {
    if (!hidden && ready) {
      a.loadBoard()
      a.loadDuels()
    }
    // Reload each time the screen is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, ready])

  const { kind, entries, loading, error, season } = a.board
  const own = kind === 'season' ? season : kind === 'daily' ? a.board.daily : null
  const mine = own?.mine ?? null
  const inList = entries.some((entry) => entry.uid === a.uid)

  return (
    <main className="screen screen--ranking" hidden={hidden}>
      <h1 className="screen__title">Classement</h1>
      <SeasonCard onRewards={() => setRewardsOpen(true)} openPlayer={a.openPlayer} />

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

      {ready && <LiveFeed />}
      {a.status === 'signedIn' && a.pseudo && <DuelsCard go={go} />}
      {kind === 'daily' && tab !== 'teams' && <DailyCard go={go} />}

      <div className="chips ranking__tabs" role="tablist" aria-label="Classements">
        {BOARDS.map((board) => (
          <button
            key={board.id}
            type="button"
            role="tab"
            aria-selected={(tab ?? kind) === board.id}
            onClick={() => (board.id === 'teams' ? setTab('teams') : (setTab(null), a.loadBoard(board.id)))}
          >
            {board.label}
          </button>
        ))}
      </div>

      {!ready && (
        <p className="note">{a.status === 'loading' ? 'Chargement…' : 'Classement indisponible pour le moment.'}</p>
      )}
      {ready && error && <p className="note">{error}</p>}
      {ready && !error && tab !== 'teams' && entries.length === 0 && (
        <p className="note">{loading ? 'Chargement…' : 'Personne pour l’instant. Soyez la première poule !'}</p>
      )}

      {tab === 'teams' && <TeamsPanel openPlayer={a.openPlayer} />}
      {tab !== 'teams' && entries.length > 0 && (
        <div aria-busy={loading}>
          <Podium kind={kind} entries={entries} uid={a.uid} open={a.openPlayer} />
          <ol className="board" start={4}>
            {entries.slice(3).map((entry, index) => (
              <li key={entry.uid} className={entry.uid === a.uid ? 'is-me' : undefined}>
                <button type="button" className="board__row" onClick={() => a.openPlayer(entry.uid, entry)}>
                  <span className="board__rank">{index + 4}</span>
                  <span className="board__who">
                    <b>
                      {divisionById(entry.division ?? entry.league) && (
                        <span className="board__league">
                          <LeagueBadge division={entry.division ?? entry.league} size={22} />
                        </span>
                      )}
                      {entry.pseudo}
                    </b>
                    <Title id={entry.title} />
                  </span>
                  <span className="board__value">{valueOf(kind, entry)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {tab !== 'teams' && mine && !inList && own?.standing && (
        <ol className="board board--me" aria-label="Votre place">
          <li className="is-me">
            <button type="button" className="board__row" onClick={() => a.openPlayer(a.uid, mine)}>
              <span className="board__rank">{own.standing.rank}</span>
              <span className="board__who">
                <b>{mine.pseudo}</b>
                <small className="muted">Vous</small>
              </span>
              <span className="board__value">{valueOf(kind, mine)}</span>
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
