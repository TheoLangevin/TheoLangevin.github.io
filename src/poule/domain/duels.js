import { DUEL_HOURS, DUEL_LEDGER_KEPT, DUEL_TRIES } from '../config/duels.js'

/** Duels between two players: pure rules (config/duels.js). */

export const DUEL_MS = DUEL_HOURS * 3_600_000

export const duelScore = (duel, uid) => duel.scores?.[uid] ?? { tries: 0, best: 0 }

/** 'open' (waiting for an answer), 'declined', 'expired' (no answer), 'playing' or 'done'. */
export function duelState(duel, now) {
  if (duel.status === 'declined') return 'declined'
  if (duel.status === 'open') return now > duel.expiresAt ? 'expired' : 'open'
  const finished = [duel.from.uid, duel.to.uid].every((uid) => duelScore(duel, uid).tries >= DUEL_TRIES)
  return finished || now > duel.expiresAt ? 'done' : 'playing'
}

/** The other side of a duel, seen from `uid`. */
export const opponentOf = (duel, uid) => (duel.from.uid === uid ? duel.to : duel.from)

/**
 * What a finished duel pays `uid` (cents), or null while it is not over.
 * Refused or unanswered: the challenger gets their stake back.
 */
export function duelPayout(duel, uid, now) {
  const state = duelState(duel, now)
  if (state === 'declined' || state === 'expired') return duel.from.uid === uid ? duel.stake : 0
  if (state !== 'done') return null
  const mine = duelScore(duel, uid).best
  const theirs = duelScore(duel, opponentOf(duel, uid).uid).best
  if (mine === theirs) return duel.stake
  return mine > theirs ? duel.stake * 2 : 0
}

/** Checks the duel ledger from a save: duel id → 'staked' | 'settled'. */
export function validLedger(raw) {
  if (!raw || typeof raw !== 'object') return {}
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([id, state]) => /^[A-Za-z0-9]{6,40}$/.test(id) && ['staked', 'settled'].includes(state))
      .slice(-DUEL_LEDGER_KEPT),
  )
}
