import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { BET_PRESETS, CENTS, MAX_PAYOUT, MIN_BET, REFILL_AMOUNT } from '../../config/economy.js'
import { DAILY_BET, DAILY_TRIES } from '../../config/daily.js'
import { DUEL_TRIES, DUEL_TRY_BET } from '../../config/duels.js'
import { MODES, modeById } from '../../config/modes.js'
import { allInBet, clampBet, refillCheck } from '../../domain/money.js'
import { multiplierAt, payoutCents } from '../../domain/multiplier.js'
import { usePoule } from '../../state/usePoule.js'
import { multiplierLabel, tokens } from '../format.js'
import { BoltIcon, CoinIcon } from '../icons.jsx'
import HistoryStrip from '../road/HistoryStrip.jsx'
import Road from '../road/Road.jsx'
import './play.css'

/** Three figures above the road: before a round, what it offers; during it, where it stands. */
function RoundHud() {
  const { round, modeId, betCents, autocash, twin, xpEvent } = usePoule(
    useShallow((state) => ({
      round: state.round,
      modeId: state.round?.modeId ?? state.modeId,
      betCents: state.round?.betCents ?? state.betCents,
      autocash: state.progression?.owned.includes('autocash') ? state.autocashTarget : null,
      twin: state.doubleNext,
      xpEvent: state.events.find((event) => event.xp?.[state.round?.modeId ?? state.modeId]) ?? null,
    })),
  )
  const mode = modeById(modeId)
  const lane = round?.lane ?? 0
  const figures = round
    ? [
        ['Multiplicateur', lane ? multiplierLabel(multiplierAt(mode, lane)) : 'x1,00'],
        ['Gain', lane ? tokens(payoutCents(betCents, mode, lane)) : '—'],
        ['Voie suivante', lane >= mode.lanes ? '—' : mode.mystery ? '?' : multiplierLabel(multiplierAt(mode, lane + 1))],
      ]
    : [
        ['Chance par voie', `${Math.round(mode.survival * 100)} %`],
        ['Voies', String(mode.lanes)],
        mode.mystery ? ['Multiplicateurs', 'Mystère'] : ['Jusqu’à', multiplierLabel(multiplierAt(mode, mode.lanes))],
      ]

  return (
    <div className={`hud${round ? ' hud--live' : ''}`}>
      {figures.map(([label, value]) => (
        <div key={label} className="hud__figure">
          <small>{label}</small>
          <b>{value}</b>
        </div>
      ))}
      {twin && <span className="hud__twin">Double poule · XP ×2 et bonus de jetons</span>}
      {!twin && !round && xpEvent && <span className="hud__twin hud__event">{xpEvent.label}</span>}
      {round && autocash && (
        <span className="hud__auto">
          <BoltIcon size={12} /> auto {multiplierLabel(autocash)}
        </span>
      )}
    </div>
  )
}

function BetPicker({ betCents, balanceCents, setBet, locked }) {
  const [draft, setDraft] = useState(String(betCents / CENTS))
  useEffect(() => setDraft(String(betCents / CENTS)), [betCents])
  const commit = (value) => {
    const next = clampBet(value, balanceCents)
    setDraft(String(next / CENTS))
    if (next !== betCents) setBet(next)
  }
  const bet = betCents / CENTS
  const allIn = allInBet(balanceCents)
  const isAllIn = betCents === allIn && balanceCents >= MIN_BET

  return (
    <div className="bet">
      <div className="bet__row">
        <button
          type="button"
          className="bet__step"
          onClick={() => commit(bet - 1)}
          disabled={locked}
          aria-label="Diminuer la mise"
        >
          −
        </button>
        <label className="bet__field">
          <span className="visually-hidden">Mise en jetons</span>
          <CoinIcon size={20} />
          <input
            type="number"
            inputMode="numeric"
            enterKeyHint="done"
            min="1"
            max={Math.max(1, Math.floor(balanceCents / CENTS))}
            value={draft}
            disabled={locked}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => commit(draft)}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          />
        </label>
        <button
          type="button"
          className="bet__step"
          onClick={() => commit(bet + 1)}
          disabled={locked}
          aria-label="Augmenter la mise"
        >
          +
        </button>
      </div>
      <div className="chips" role="group" aria-label="Mises rapides">
        <button
          type="button"
          className="chip--allin"
          aria-pressed={isAllIn}
          onClick={() => {
            setDraft(String(allIn / CENTS))
            if (allIn !== betCents) setBet(allIn)
          }}
          disabled={locked || balanceCents < MIN_BET}
          aria-label="Miser tous mes jetons"
        >
          Tapis
        </button>
        {BET_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={bet === preset}
            onClick={() => commit(preset)}
            disabled={locked}
          >
            {preset}
          </button>
        ))}
        <button type="button" onClick={() => commit(bet / 2)} disabled={locked} aria-label="Moitié de la mise">
          ½
        </button>
        <button type="button" onClick={() => commit(bet * 2)} disabled={locked} aria-label="Doubler la mise">
          ×2
        </button>
      </div>
    </div>
  )
}

function Refill({ balanceCents, lastRefillAt, refill }) {
  const [now, setNow] = useState(Date.now)
  const check = refillCheck({ balanceCents, lastRefillAt, now })
  useEffect(() => {
    if (check.verdict !== 'wait') return undefined
    const timer = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(timer)
  }, [check.verdict])
  if (check.verdict === 'not-broke') return null
  const minutes = Math.ceil(check.waitMs / 60_000)
  return (
    <button type="button" className="refill" onClick={refill} disabled={check.verdict !== 'ok'}>
      <CoinIcon size={20} />
      {check.verdict === 'ok'
        ? `Recharge gratuite : +${tokens(REFILL_AMOUNT)} jetons`
        : `Prochaine recharge (+${tokens(REFILL_AMOUNT)}) dans ${minutes} min`}
    </button>
  )
}

/** During a round: the bet, the risk of the next lane and how far the hen got. */
function RoundCard({ round, mode }) {
  const done = round.lane / mode.lanes
  return (
    <div className="round-card">
      <div className="round-card__row">
        <span>
          Mise <b>{tokens(round.betCents)}</b>
        </span>
        <span>
          Prochaine voie <b>{Math.round(mode.survival * 100)} %</b> de réussite
        </span>
      </div>
      <div className="round-card__track" aria-label={`${round.lane} voies sur ${mode.lanes}`}>
        <span style={{ width: `${Math.round(done * 100)}%` }} />
      </div>
      <div className="round-card__row round-card__row--small">
        <span>
          {round.lane} / {mode.lanes} voies
        </span>
        <span>Arrivée {multiplierLabel(multiplierAt(mode, mode.lanes))}</span>
      </div>
    </div>
  )
}

/** Mode, bet and play before a round; cash out and step during it. */
function PlayControls() {
  const s = usePoule(
    useShallow((state) => ({
      ready: state.phase === 'ready',
      busy: state.busy,
      round: state.round,
      modeId: state.modeId,
      betCents: state.betCents,
      balanceCents: state.balanceCents,
      lastRefillAt: state.lastRefillAt,
      setMode: state.setMode,
      setBet: state.setBet,
      play: state.play,
      cashOut: state.cashOut,
      refill: state.refill,
      challenge: state.challenge,
      daily: state.daily,
      setChallenge: state.setChallenge,
      duel: state.duel,
      duelTries: state.duelTries,
      setDuel: state.setDuel,
    })),
  )
  const round = s.round
  const mode = modeById(round?.modeId ?? s.modeId)
  const cash = round?.canCashOut ? Math.min(payoutCents(round.betCents, mode, round.lane), MAX_PAYOUT) : 0
  const locked = Boolean(round) || s.busy || !s.ready

  return (
    <div className="controls">
      {/* Both panels share one grid cell, so the road keeps its size between them. */}
      <div className="controls__panel" hidden={Boolean(round)} aria-hidden={Boolean(round)}>
        {s.duel ? (
          <div className="challenge">
            <div>
              <b>
                Duel contre {s.duel.opponent} · {modeById(s.duel.modeId).label}
              </b>
              <small>
                Mise {tokens(DUEL_TRY_BET)} jetons · essai {(s.duelTries[s.duel.id]?.tries ?? 0) + 1}/{DUEL_TRIES} ·
                meilleur {s.duelTries[s.duel.id]?.best ? multiplierLabel(s.duelTries[s.duel.id].best) : '—'}
              </small>
            </div>
            <button type="button" onClick={() => s.setDuel(null)} disabled={locked}>
              Quitter
            </button>
          </div>
        ) : s.challenge && s.daily ? (
          <div className="challenge">
            <div>
              <b>Défi du jour · {s.daily.mode.label}</b>
              <small>
                Mise {tokens(DAILY_BET)} jetons · essai {DAILY_TRIES - s.daily.left + 1}/{DAILY_TRIES} · meilleur{' '}
                {s.daily.best ? multiplierLabel(s.daily.best) : '—'}
              </small>
            </div>
            <button type="button" onClick={() => s.setChallenge(false)} disabled={locked}>
              Quitter
            </button>
          </div>
        ) : (
          <>
            {s.daily?.left > 0 && (
              <button
                type="button"
                className="challenge-entry"
                onClick={() => s.setChallenge(true)}
                disabled={locked}
              >
                🏁 Défi du jour · {s.daily.mode.label} · {s.daily.left} essai{s.daily.left > 1 ? 's' : ''}
              </button>
            )}
        <div className="chips modes" role="group" aria-label="Mode">
          {MODES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={entry.id === s.modeId}
              disabled={locked}
              onClick={() => s.setMode(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <BetPicker betCents={s.betCents} balanceCents={s.balanceCents} setBet={s.setBet} locked={locked} />
          </>
        )}
        <Refill balanceCents={s.balanceCents} lastRefillAt={s.lastRefillAt} refill={s.refill} />
        {s.duel ? (
          <button
            type="button"
            className="big big--play"
            onClick={s.play}
            disabled={locked || s.balanceCents < DUEL_TRY_BET}
          >
            Jouer l’essai <small>{tokens(DUEL_TRY_BET)} jetons</small>
          </button>
        ) : s.challenge ? (
          <button
            type="button"
            className="big big--play"
            onClick={s.play}
            disabled={locked || s.balanceCents < DAILY_BET}
          >
            Jouer l’essai <small>{tokens(DAILY_BET)} jetons</small>
          </button>
        ) : s.balanceCents < s.betCents && s.balanceCents >= MIN_BET ? (
          // The bet is more than what is left: offer to play what is left.
          <button
            type="button"
            className="big big--play"
            onClick={() => {
              s.setBet(allInBet(s.balanceCents))
              s.play()
            }}
            disabled={locked}
          >
            Miser le reste <small>{tokens(s.balanceCents)} jetons</small>
          </button>
        ) : (
          <button
            type="button"
            className="big big--play"
            onClick={s.play}
            disabled={locked || s.balanceCents < s.betCents}
          >
            {s.betCents === s.balanceCents ? 'Tapis !' : 'Jouer'} <small>{tokens(s.betCents)} jetons</small>
          </button>
        )}
      </div>

      <div className="controls__panel controls__panel--live" hidden={!round} aria-hidden={!round}>
        {round && <RoundCard round={round} mode={mode} />}
        <p className="controls__hint">Touchez la route ou « Avancer ». Encaissez avant la voiture.</p>
        <div className="controls__pair">
          <button type="button" className="big big--cash" onClick={s.cashOut} disabled={s.busy || !round?.canCashOut}>
            Encaisser
            <small>{round?.canCashOut ? `${tokens(cash)} jetons` : 'après une voie'}</small>
          </button>
          <button type="button" className="big big--play" onClick={s.play} disabled={s.busy || !round}>
            Avancer
            <small>{round && round.lane < mode.lanes ? (mode.mystery ? '?' : multiplierLabel(multiplierAt(mode, round.lane + 1))) : ''}</small>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PlayScreen({ hidden }) {
  return (
    <main className="screen screen--play" hidden={hidden}>
      <RoundHud />
      <div className="play__road">
        <Road />
      </div>
      <HistoryStrip />
      <PlayControls />
    </main>
  )
}
