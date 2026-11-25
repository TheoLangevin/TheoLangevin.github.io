import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { DUEL_HOURS, DUEL_STAKES, DUEL_TRIES, DUEL_TRY_BET } from '../../config/duels.js'
import { MODES, modeById } from '../../config/modes.js'
import { duelScore, opponentOf } from '../../domain/duels.js'
import { useAccount } from '../../state/useAccount.js'
import { usePoule } from '../../state/usePoule.js'
import Dialog from '../account/Dialog.jsx'
import { multiplierLabel, tokens } from '../format.js'

const best = (score) => (score.best ? multiplierLabel(score.best) : '—')
const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`

/** Whether the signed-in player may challenge `player`. */
export function canChallenge(state, player) {
  return Boolean(state.user && state.pseudo && player?.uid && player.pseudo && player.uid !== state.user.uid)
}

/** The one sentence that says where a duel stands, and what it gave. */
function duelStatus(duel, me, mine, theirs, other) {
  if (duel.state === 'declined') return { text: `${other.pseudo} a refusé · mise rendue`, tone: 'muted' }
  if (duel.state === 'expired') return { text: 'Pas de réponse à temps · mise rendue', tone: 'muted' }
  if (duel.state === 'open') {
    return duel.to.uid === me
      ? { text: `${other.pseudo} vous défie !`, tone: 'action' }
      : { text: `En attente de la réponse de ${other.pseudo}`, tone: 'muted' }
  }
  if (duel.state === 'done') {
    if (mine.best === theirs.best) return { text: 'Égalité · mise rendue', tone: 'muted' }
    return mine.best > theirs.best
      ? { text: `Gagné ! +${tokens(duel.stake * 2)} jetons`, tone: 'win' }
      : { text: `Perdu · ${other.pseudo} a fait mieux`, tone: 'lose' }
  }
  if (mine.tries < DUEL_TRIES) return { text: `À vous de jouer : ${plural(DUEL_TRIES - mine.tries, 'essai')}`, tone: 'action' }
  return { text: `En attente des essais de ${other.pseudo}`, tone: 'muted' }
}

/** The challenge sheet: pick a mode and a stake, see what is at play, send. */
export function ChallengeSheet() {
  const { target, close, challenge } = useAccount(
    useShallow((state) => ({ target: state.challengeTarget, close: state.closeChallenge, challenge: state.challenge })),
  )
  const { balance, currentMode } = usePoule(useShallow((state) => ({ balance: state.balanceCents, currentMode: state.modeId })))
  const [modeId, setModeId] = useState(null)
  const [stake, setStake] = useState(DUEL_STAKES[0])
  const [busy, setBusy] = useState(false)
  if (!target) return null
  const mode = modeById(modeId ?? currentMode)
  const enough = balance >= stake

  const send = async () => {
    setBusy(true)
    const sent = await challenge(target, stake, mode.id)
    setBusy(false)
    if (sent) close()
  }

  return (
    <Dialog
      title={`Défier ${target.pseudo}`}
      onClose={close}
      actions={
        <>
          {!enough && <p className="note">Pas assez de jetons pour cette mise.</p>}
          <button type="button" className="big big--play" disabled={busy || !enough} onClick={send}>
            {busy ? 'Envoi…' : `Envoyer le défi · ${tokens(stake)} jetons`}
          </button>
        </>
      }
    >
      <h3 className="sheet__h">Mode</h3>
      <div className="segmented" role="group" aria-label="Mode du duel">
        {MODES.map((entry) => (
          <button key={entry.id} type="button" aria-pressed={entry.id === mode.id} onClick={() => setModeId(entry.id)}>
            {entry.label}
          </button>
        ))}
      </div>
      <h3 className="sheet__h">Mise</h3>
      <div className="chips" role="group" aria-label="Mise du duel">
        {DUEL_STAKES.map((value) => (
          <button key={value} type="button" aria-pressed={value === stake} onClick={() => setStake(value)}>
            {tokens(value)} jetons
          </button>
        ))}
      </div>
      <ol className="duel-rules">
        <li>
          Vous misez <b>{tokens(stake)}</b>, {target.pseudo} mise autant en acceptant ({DUEL_HOURS} h pour répondre).
        </li>
        <li>
          Chacun joue <b>{DUEL_TRIES} essais</b> en {mode.label} ({tokens(DUEL_TRY_BET)} jetons l’essai).
        </li>
        <li>
          Le meilleur multiplicateur encaissé gagne <b>{tokens(stake * 2)} jetons</b>. Égalité ou refus : mise rendue.
        </li>
      </ol>
    </Dialog>
  )
}

/** One duel: who, where it stands, and the one thing to do now. */
function DuelLine({ duel, me, play }) {
  const { answer, openChallenge } = useAccount(
    useShallow((state) => ({ answer: state.answerDuel, openChallenge: state.openChallenge })),
  )
  const { localTries, inRound } = usePoule(
    useShallow((state) => ({ localTries: state.duelTries, inRound: Boolean(state.round) })),
  )
  const [busy, setBusy] = useState(false)
  const other = opponentOf(duel, me)
  const mine = { ...duelScore(duel, me), ...(localTries[duel.id] ?? {}) }
  const theirs = duelScore(duel, other.uid)
  const status = duelStatus(duel, me, mine, theirs, other)
  const incoming = duel.state === 'open' && duel.to.uid === me
  const canPlay = duel.state === 'playing' && mine.tries < DUEL_TRIES
  const over = ['done', 'declined', 'expired'].includes(duel.state)

  return (
    <li className={`duel duel--${status.tone}`}>
      <div className="duel__head">
        <b>{other.pseudo}</b>
        <small>
          {modeById(duel.mode).label} · mise {tokens(duel.stake)}
        </small>
      </div>
      <p className={`duel__status duel__status--${status.tone}`}>{status.text}</p>
      {['playing', 'done'].includes(duel.state) && (
        <div className="duel__score">
          <span>
            Vous <b>{best(mine)}</b> · {mine.tries}/{DUEL_TRIES}
          </span>
          <span>
            {other.pseudo} <b>{best(theirs)}</b> · {theirs.tries}/{DUEL_TRIES}
          </span>
        </div>
      )}
      {incoming && (
        <div className="duel__actions">
          <button
            type="button"
            className="big big--play"
            disabled={busy || inRound}
            onClick={async () => {
              setBusy(true)
              if (await answer(duel, true)) play(duel, other)
              setBusy(false)
            }}
          >
            Accepter et jouer
          </button>
          <button type="button" disabled={busy} onClick={() => answer(duel, false)}>
            Refuser
          </button>
        </div>
      )}
      {canPlay && (
        <button type="button" className="big big--play" disabled={inRound} onClick={() => play(duel, other)}>
          Jouer mes essais
        </button>
      )}
      {over && (
        <button type="button" className="duel__again" onClick={() => openChallenge(other)}>
          ⚔️ Revanche
        </button>
      )}
    </li>
  )
}

/** Players to challenge: those of the board on screen, then past opponents. */
function NewDuel({ me, onPick }) {
  const { entries, list } = useAccount(useShallow((state) => ({ entries: state.board.entries, list: state.duels.list })))
  const seen = new Set([me])
  const players = []
  for (const player of [...entries, ...list.map((duel) => opponentOf(duel, me))]) {
    if (!player?.uid || !player.pseudo || seen.has(player.uid)) continue
    seen.add(player.uid)
    players.push({ uid: player.uid, pseudo: player.pseudo })
  }
  if (players.length === 0) return <p className="note">Aucun joueur à défier pour l’instant.</p>
  return (
    <div className="chips duel-pick" role="group" aria-label="Choisir un adversaire">
      {players.slice(0, 20).map((player) => (
        <button key={player.uid} type="button" onClick={() => onPick(player)}>
          {player.pseudo}
        </button>
      ))}
    </div>
  )
}

/** Duels card on the ranking screen, and its sheet. */
export function DuelsCard({ go }) {
  const { me, list, load, openChallenge } = useAccount(
    useShallow((state) => ({
      me: state.user?.uid,
      list: state.duels.list,
      load: state.loadDuels,
      openChallenge: state.openChallenge,
    })),
  )
  const setDuel = usePoule((state) => state.setDuel)
  const [open, setOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  if (!me) return null
  const incoming = list.filter((duel) => duel.state === 'open' && duel.to.uid === me).length
  const toPlay = list.filter((duel) => duel.state === 'playing').length
  const summary = incoming
    ? `${plural(incoming, 'défi')} à accepter`
    : toPlay
      ? `${plural(toPlay, 'duel')} en cours`
      : 'Misez contre un autre joueur : le meilleur des 3 essais gagne tout.'

  const play = (duel, other) => {
    setDuel({ id: duel.id, modeId: duel.mode, opponent: other.pseudo })
    setOpen(false)
    go('jouer')
  }

  return (
    <>
      <button
        type="button"
        className="cta card duels-card"
        onClick={() => {
          load()
          setOpen(true)
        }}
      >
        <b>⚔️ Duels {incoming + toPlay > 0 && <span className="pill-badge">{incoming + toPlay}</span>}</b>
        <span className="muted">{summary}</span>
      </button>
      {open && (
        <Dialog
          title="Duels"
          onClose={() => setOpen(false)}
          actions={
            <button type="button" className="big big--buy" onClick={() => setPicking(!picking)}>
              {picking ? 'Fermer la liste' : '⚔️ Nouveau duel'}
            </button>
          }
        >
          {picking && (
            <section className="duel-new">
              <h3 className="sheet__h">Qui défier ?</h3>
              <NewDuel
                me={me}
                onPick={(player) => {
                  setPicking(false)
                  setOpen(false)
                  openChallenge(player)
                }}
              />
            </section>
          )}
          {list.length === 0 ? (
            <p className="note">
              Aucun duel pour l’instant. Touchez « Nouveau duel », ou le nom d’un joueur dans le classement.
            </p>
          ) : (
            <ul className="duels">
              {list.map((duel) => (
                <DuelLine key={duel.id} duel={duel} me={me} play={play} />
              ))}
            </ul>
          )}
        </Dialog>
      )}
    </>
  )
}
