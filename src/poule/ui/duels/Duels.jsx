import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { DUEL_STAKES, DUEL_TRIES, DUEL_TRY_BET } from '../../config/duels.js'
import { modeById } from '../../config/modes.js'
import { duelScore, opponentOf } from '../../domain/duels.js'
import { useAccount } from '../../state/useAccount.js'
import { usePoule } from '../../state/usePoule.js'
import Dialog from '../account/Dialog.jsx'
import { multiplierLabel, tokens } from '../format.js'

const STATE_LABEL = {
  open: 'En attente',
  playing: 'En cours',
  done: 'Terminé',
  declined: 'Refusé',
  expired: 'Sans réponse',
}

const best = (score) => (score.best ? multiplierLabel(score.best) : '—')

/** Challenge another player (from their profile). */
export function ChallengeButtons({ player }) {
  const { me, pseudo, challenge } = useAccount(
    useShallow((state) => ({ me: state.user?.uid, pseudo: state.pseudo, challenge: state.challenge })),
  )
  const { balance, modeId } = usePoule(useShallow((state) => ({ balance: state.balanceCents, modeId: state.modeId })))
  const [busy, setBusy] = useState(false)
  if (!me || !pseudo || player.uid === me || !player.pseudo) return null
  return (
    <div className="duel-offer">
      <h3 className="sheet__h">Défier en duel · {modeById(modeId).label}</h3>
      <p className="note">
        Chacun mise autant, {DUEL_TRIES} essais à {tokens(DUEL_TRY_BET)} jetons, le meilleur multiplicateur gagne tout.
      </p>
      <div className="chips">
        {DUEL_STAKES.map((stake) => (
          <button
            key={stake}
            type="button"
            disabled={busy || balance < stake}
            onClick={async () => {
              setBusy(true)
              await challenge(player, stake)
              setBusy(false)
            }}
          >
            ⚔️ {tokens(stake)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** One duel, seen by the player, with what they can do now. */
function DuelLine({ duel, me, go, close }) {
  const { answer } = useAccount(useShallow((state) => ({ answer: state.answerDuel })))
  const { setDuel, localTries, inRound } = usePoule(
    useShallow((state) => ({ setDuel: state.setDuel, localTries: state.duelTries, inRound: Boolean(state.round) })),
  )
  const other = opponentOf(duel, me)
  const mine = { ...duelScore(duel, me), ...(localTries[duel.id] ?? {}) }
  const theirs = duelScore(duel, other.uid)
  const incoming = duel.state === 'open' && duel.to.uid === me
  const canPlay = duel.state === 'playing' && mine.tries < DUEL_TRIES
  const result =
    duel.state === 'done' ? (mine.best > theirs.best ? 'Gagné' : mine.best < theirs.best ? 'Perdu' : 'Égalité') : null

  return (
    <li className={`duel duel--${duel.state}`}>
      <div className="duel__head">
        <b>{other.pseudo}</b>
        <small>
          {modeById(duel.mode).label} · mise {tokens(duel.stake)} · {result ?? STATE_LABEL[duel.state]}
        </small>
      </div>
      {['playing', 'done'].includes(duel.state) && (
        <div className="duel__score">
          <span>
            Vous <b>{best(mine)}</b> ({mine.tries}/{DUEL_TRIES})
          </span>
          <span>
            {other.pseudo} <b>{best(theirs)}</b> ({theirs.tries}/{DUEL_TRIES})
          </span>
        </div>
      )}
      {incoming && (
        <div className="duel__actions">
          <button type="button" className="big big--play" onClick={() => answer(duel, true)}>
            Accepter ({tokens(duel.stake)})
          </button>
          <button type="button" onClick={() => answer(duel, false)}>
            Refuser
          </button>
        </div>
      )}
      {canPlay && (
        <button
          type="button"
          className="big big--play"
          disabled={inRound}
          onClick={() => {
            setDuel({ id: duel.id, modeId: duel.mode, opponent: other.pseudo })
            close()
            go('jouer')
          }}
        >
          Jouer ({DUEL_TRIES - mine.tries} essai{DUEL_TRIES - mine.tries > 1 ? 's' : ''})
        </button>
      )}
    </li>
  )
}

/** Duels card on the ranking screen, and its sheet. */
export function DuelsCard({ go }) {
  const { me, list, load } = useAccount(
    useShallow((state) => ({ me: state.user?.uid, list: state.duels.list, load: state.loadDuels })),
  )
  const [open, setOpen] = useState(false)
  if (!me) return null
  const incoming = list.filter((duel) => duel.state === 'open' && duel.to.uid === me).length
  const playing = list.filter((duel) => duel.state === 'playing').length
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
        <b>⚔️ Duels {incoming > 0 && <span className="pill-badge">{incoming}</span>}</b>
        <span className="muted">
          {incoming
            ? `${incoming} défi${incoming > 1 ? 's' : ''} reçu${incoming > 1 ? 's' : ''}`
            : playing
              ? `${playing} duel${playing > 1 ? 's' : ''} en cours`
              : 'Défiez un joueur depuis son profil (touchez son nom).'}
        </span>
      </button>
      {open && (
        <Dialog title="Duels" onClose={() => setOpen(false)}>
          {list.length === 0 ? (
            <p className="note">Aucun duel pour l’instant. Touchez un joueur du classement pour le défier.</p>
          ) : (
            <ul className="duels">
              {list.map((duel) => (
                <DuelLine key={duel.id} duel={duel} me={me} go={go} close={() => setOpen(false)} />
              ))}
            </ul>
          )}
        </Dialog>
      )}
    </>
  )
}
