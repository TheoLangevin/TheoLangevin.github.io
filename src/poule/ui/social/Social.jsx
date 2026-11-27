import { eggs } from '../coop/format.js'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { modeById } from '../../config/modes.js'
import { TEAM_SIZE } from '../../config/teams.js'
import { divisionById } from '../../domain/leagues.js'
import { useAccount } from '../../state/useAccount.js'
import { count, multiplierLabel } from '../format.js'

const ago = (at) => {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60_000))
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  if (minutes < 1440) return `il y a ${Math.round(minutes / 60)} h`
  return `il y a ${Math.round(minutes / 1440)} j`
}

/** One line of the activity feed, in words. */
function feedText(item) {
  const mode = item.mode ? modeById(item.mode).label : ''
  if (item.kind === 'finish') return `a traversé toute la route en ${mode} (${multiplierLabel(item.mult)}) !`
  if (item.kind === 'duel') return `a gagné son duel contre ${item.other} (${multiplierLabel(item.mult)})`
  if (item.kind === 'promotion') return `monte en ${divisionById(item.other)?.label ?? 'ligue supérieure'} !`
  return `vient d’encaisser ${multiplierLabel(item.mult)} en ${mode} !`
}

/** "En direct": the latest big moments of all players. */
export function LiveFeed() {
  const { feed, load } = useAccount(useShallow((state) => ({ feed: state.feed, load: state.loadFeed })))
  useEffect(() => {
    load()
    const timer = setInterval(load, 60_000)
    return () => clearInterval(timer)
  }, [load])
  if (feed.length === 0) return null
  return (
    <section className="card feed">
      <h2>
        <i className="feed__dot" aria-hidden="true" /> En direct
      </h2>
      <ul>
        {feed.slice(0, 6).map((item) => (
          <li key={item.id ?? item.at}>
            <span>
              <b>{item.pseudo}</b> {feedText(item)}
            </span>
            <small>{ago(item.at)}</small>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Familles poule: the player's team (or how to get one) and the team board. Its creator is the papa poule. */
export function TeamsPanel({ openPlayer }) {
  const a = useAccount(
    useShallow((state) => ({
      me: state.user?.uid,
      pseudo: state.pseudo,
      teams: state.teams,
      load: state.loadTeams,
      act: state.teamAction,
    })),
  )
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    a.load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const run = async (action, argument) => {
    setBusy(true)
    const done = await a.act(action, argument)
    setBusy(false)
    return done
  }
  const { list, mine, loading } = a.teams
  const canAct = Boolean(a.me && a.pseudo)

  return (
    <>
      {mine ? (
        <section className="card team">
          <div className="team__head">
            <div>
              <small className="muted">Ma famille poule</small>
              <h2>{mine.name}</h2>
              {mine.coopWeek > 0 && <small className="muted">🥚 {eggs(mine.coopWeek)} œufs pondus ensemble cette semaine</small>}
            </div>
            <b className="team__lp">{count(mine.lp)} PL</b>
          </div>
          <ul className="team__members">
            {mine.members.map((uid) => (
              <li key={uid}>
                <button type="button" onClick={() => openPlayer(uid, { pseudo: mine.pseudos?.[uid] })}>
                  {mine.pseudos?.[uid] ?? '?'}
                  {uid === mine.owner ? ' · 🐓 papa poule' : ''}
                  {uid === a.me ? ' (vous)' : ''}
                </button>
              </li>
            ))}
          </ul>
          <small className="muted">
            {mine.size}/{TEAM_SIZE} membres · invitez vos amis : ils rejoignent depuis cet onglet.
          </small>
          <button type="button" className="link-button" disabled={busy} onClick={() => run('leave')}>
            Quitter la famille
          </button>
        </section>
      ) : (
        canAct && (
          <section className="card team">
            <h2>Rejoignez une famille poule</h2>
            <p className="muted">
              Jusqu’à {TEAM_SIZE} joueurs : vos points de ligue s’additionnent dans le classement des familles. Celui qui crée la famille en est le papa poule.
            </p>
            <form
              className="team__create"
              onSubmit={async (event) => {
                event.preventDefault()
                if (await run('create', name)) setName('')
              }}
            >
              <input
                value={name}
                maxLength={20}
                placeholder="Nom de votre famille"
                onChange={(event) => setName(event.target.value)}
                aria-label="Nom de la famille"
              />
              <button type="submit" disabled={busy || name.trim().length < 3}>
                Créer
              </button>
            </form>
          </section>
        )
      )}
      {!canAct && <p className="note">Connectez-vous et choisissez un pseudo pour rejoindre une famille poule.</p>}

      {loading && list.length === 0 && <p className="note">Chargement…</p>}
      {!loading && list.length === 0 && <p className="note">Aucune famille pour l’instant. Créez la première et devenez papa poule !</p>}
      <ol className="board">
        {list.map((team, index) => (
          <li key={team.id} className={team.id === mine?.id ? 'is-me' : undefined}>
            <div className="board__row team__row">
              <span className="board__rank">{index + 1}</span>
              <span className="board__who">
                <b>{team.name}</b>
                <small className="muted">
                  {team.size}/{TEAM_SIZE} · {Object.values(team.pseudos ?? {}).slice(0, 3).join(', ')}
                  {team.size > 3 ? '…' : ''}
                </small>
              </span>
              <span className="board__value">{count(team.lp)} PL</span>
              {canAct && !mine && team.size < TEAM_SIZE && (
                <button type="button" className="team__join" disabled={busy} onClick={() => run('join', team)}>
                  Rejoindre
                </button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}
